"""依 DB 內使用者與 KOCA 盲盒圖鑑，動態產生豐富的假資料規格。"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from app_seed_lib import SEED_MARKER, SEED_USERS

RICH_DEMO_MARKER = "[rich-demo]"

_LISTING_PER_USER = 8
_CART_PER_USER = 5
_COLLECTION_COLLECTED = 10
_COLLECTION_WISHLIST = 8
_NOTIFICATIONS_PER_USER = 8
_MESSAGES_PER_CHAT = 4

_TRADE_MODES = ("sell", "sell", "sell", "swap", "sell", "swap", "sell", "sell")
_CONDITIONS = ("sealed", "sealed", "opened", "sealed", "sealed", "opened", "sealed", "sealed")
_ORDER_STATUSES = (
    "completed",
    "completed",
    "shipped",
    "pending",
    "pending",
    "delivered",
    "completed",
    "shipped",
)
_CHAT_STATUSES = ("active", "swapping", "active", "completed", "active")
_NOTIFICATION_TYPES = ("system", "trade", "activity", "trade", "support", "trade", "activity", "trade")
_SWAP_STATUSES = ("pending", "accepted", "pending", "rejected")


@dataclass
class RichSeedBundle:
    user_ids: dict[str, str]
    listing_specs: list[tuple[str, str, str, str, bool, int]]
    cart_specs: list[tuple[str, str, str]]
    order_specs: list[tuple[str, str, str, str]]
    chat_specs: list[tuple[str, str, str, str]]
    message_specs: list[tuple[int, str, str]]
    message_read_specs: list[tuple[int, str]]
    swap_specs: list[tuple[str, str, str, str, str, str, str, int]]
    split_box_specs: list[
        tuple[str, str, str, list[tuple[str, bool]], list[tuple[str, str]]]
    ]
    group_buy_specs: list[tuple[str, str, int, list[str], str]]
    collection_specs: list[tuple[str, str, str]]
    notification_specs: list[tuple[str, str, str, str, bool]]


def _listing_price(product: dict[str, Any], salt: int) -> int:
    amount = product.get("official_price_amount")
    if amount and int(amount) > 0:
        return int(amount)
    return 350 + (salt % 40) * 25


def ensure_seed_users(cur) -> dict[str, str]:
    from auth_util import hash_password

    pw = hash_password()
    ids: dict[str, str] = {}
    for email, name in SEED_USERS:
        cur.execute(
            """
            INSERT INTO users (display_name, email, password_hash, bio)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                password_hash = EXCLUDED.password_hash,
                updated_at = now()
            RETURNING id
            """,
            (name, email, pw, f"{RICH_DEMO_MARKER} 測試帳號，密碼 password。"),
        )
        row = cur.fetchone()
        assert row
        ids[email] = str(row["id"])

    cur.execute(
        """
        SELECT id, email FROM users
        WHERE deleted_at IS NULL AND email IS NOT NULL
        ORDER BY created_at
        """
    )
    for row in cur.fetchall():
        email = str(row["email"])
        ids[email] = str(row["id"])
    return ids


def load_catalog_products(cur, *, limit: int = 500) -> list[dict[str, Any]]:
    cur.execute(
        """
        SELECT
            cp.id,
            cp.external_id,
            cp.title,
            cp.image_url,
            cp.series_id,
            s.brand_id,
            cp.official_price_amount
        FROM catalog_products cp
        LEFT JOIN series s ON s.id = cp.series_id
        ORDER BY cp.external_id
        LIMIT %s
        """,
        (limit,),
    )
    return [dict(r) for r in cur.fetchall()]


def build_rich_seed_bundle(
    user_ids: dict[str, str],
    products: list[dict[str, Any]],
    *,
    rng: random.Random | None = None,
) -> RichSeedBundle:
    rng = rng or random.Random(42)
    emails = [e for e, _ in SEED_USERS if e in user_ids]
    if len(emails) < 2:
        emails = list(user_ids.keys())[:5]
    if len(emails) < 2:
        raise ValueError("至少需要 2 位使用者才能產生 rich demo")
    if len(products) < 20:
        raise ValueError(f"圖鑑商品不足（{len(products)}），請先 npm run db:seed")

    n_users = len(emails)
    n_products = len(products)

    listing_specs: list[tuple[str, str, str, str, bool, int]] = []
    product_idx = 0
    for ui, email in enumerate(emails):
        for j in range(_LISTING_PER_USER):
            p = products[(product_idx + ui * _LISTING_PER_USER + j) % n_products]
            product_idx += 1
            ext = str(p["external_id"])
            trade_mode = _TRADE_MODES[j % len(_TRADE_MODES)]
            condition = _CONDITIONS[j % len(_CONDITIONS)]
            allow_swap = trade_mode == "swap"
            cents = _listing_price(p, product_idx)
            if trade_mode == "swap" and j % 3 == 0:
                cents = 0
            listing_specs.append((email, ext, trade_mode, condition, allow_swap, cents))

    sell_rows = [s for s in listing_specs if s[2] == "sell" and s[5] > 0]
    order_specs: list[tuple[str, str, str, str]] = []
    for i, (seller_email, ext_id, *_rest) in enumerate(sell_rows):
        buyer_email = emails[(i + 1) % n_users]
        if buyer_email == seller_email:
            buyer_email = emails[(i + 2) % n_users]
        status = _ORDER_STATUSES[i % len(_ORDER_STATUSES)]
        order_specs.append((buyer_email, seller_email, ext_id, status))

    # 每位使用者至少再當一次買家（循環補單）
    for ui, email in enumerate(emails):
        for k in range(2):
            row = sell_rows[(ui * 2 + k) % len(sell_rows)]
            seller_email, ext_id = row[0], row[1]
            if email == seller_email:
                continue
            status = "completed" if k == 0 else "shipped"
            tup = (email, seller_email, ext_id, status)
            if tup not in order_specs:
                order_specs.append(tup)

    cart_specs: list[tuple[str, str, str]] = []
    for ui, buyer_email in enumerate(emails):
        for k in range(_CART_PER_USER):
            row = sell_rows[(ui * 3 + k) % len(sell_rows)]
            seller_email, ext_id = row[0], row[1]
            if buyer_email == seller_email:
                seller_email, ext_id = sell_rows[(ui + k + 1) % len(sell_rows)][0:2]
            cart_specs.append((buyer_email, seller_email, ext_id))

    chat_specs: list[tuple[str, str, str, str]] = []
    for i, (seller_email, ext_id, trade_mode, *_rest) in enumerate(
        listing_specs[: n_users * 3]
    ):
        buyer_email = emails[(i + 1) % n_users]
        if buyer_email == seller_email:
            buyer_email = emails[(i + 2) % n_users]
        status = _CHAT_STATUSES[i % len(_CHAT_STATUSES)]
        if trade_mode == "swap":
            status = "swapping"
        chat_specs.append((buyer_email, seller_email, ext_id, status))

    message_specs: list[tuple[int, str, str]] = []
    message_read_specs: list[tuple[int, str]] = []
    chat_templates = [
        ("你好，想問這款還在嗎？", "在的，盒況良好～"),
        ("可以小議價嗎？", "可以，私訊聊。"),
        ("想約面交方便嗎？", "週末信義區可以。"),
        ("已下單，謝謝！", "收到，今天會出貨。"),
    ]
    for chat_idx, (buyer, seller, *_rest) in enumerate(
        [(c[0], c[1], c[2], c[3]) for c in chat_specs]
    ):
        for j in range(_MESSAGES_PER_CHAT):
            if j % 2 == 0:
                sender = buyer if j // 2 % 2 == 0 else seller
                text = chat_templates[j % len(chat_templates)][0]
            else:
                sender = seller if j // 2 % 2 == 0 else buyer
                text = chat_templates[j % len(chat_templates)][1]
            message_specs.append((chat_idx, sender, f"{RICH_DEMO_MARKER} {text}"))
        message_read_specs.append((chat_idx, buyer))
        message_read_specs.append((chat_idx, seller))

    swap_specs: list[tuple[str, str, str, str, str, str, str, int]] = []
    swap_listings = [s for s in listing_specs if s[2] == "swap"]
    for i in range(0, len(swap_listings) - 1, 2):
        a = swap_listings[i]
        b = swap_listings[i + 1]
        proposer, receiver = a[0], b[0]
        if proposer == receiver:
            receiver = emails[(emails.index(proposer) + 1) % n_users]
        status = _SWAP_STATUSES[(i // 2) % len(_SWAP_STATUSES)]
        swap_specs.append(
            (
                proposer,
                receiver,
                a[0],
                a[1],
                b[0],
                b[1],
                status,
                20000 if status == "pending" else 0,
            )
        )

    by_series: dict[str | None, list[dict[str, Any]]] = defaultdict(list)
    for p in products:
        key = str(p.get("series_id") or "none")
        by_series[key].append(p)

    series_pools = [v for v in by_series.values() if len(v) >= 4]
    if not series_pools:
        series_pools = [products[:6]]

    split_box_specs: list[
        tuple[str, str, str, list[tuple[str, bool]], list[tuple[str, str]]]
    ] = []
    group_statuses = ("open", "full", "shipping", "completed", "open")
    for ui, email in enumerate(emails):
        pool = series_pools[ui % len(series_pools)]
        rng.shuffle(pool)
        slot_count = min(6, max(4, len(pool)))
        primary = pool[0]
        primary_ext = str(primary["external_id"])
        status = group_statuses[ui % len(group_statuses)]
        slot_defs: list[tuple[str, bool]] = []
        claim_defs: list[tuple[str, str]] = []
        for si, p in enumerate(pool[:slot_count]):
            ext = str(p["external_id"])
            host = si == 0
            slot_defs.append((ext, host))
            if not host and si <= slot_count // 2:
                claimer = emails[(ui + si) % n_users]
                if claimer != email:
                    claim_defs.append((ext, claimer))
        split_box_specs.append((email, status, primary_ext, slot_defs, claim_defs))

    group_buy_specs: list[tuple[str, str, int, list[str], str]] = []
    gb_statuses = ("open", "full", "open", "completed", "open")
    for ui, email in enumerate(emails):
        p = products[(ui * 11) % n_products]
        ext = str(p["external_id"])
        target = 4 + (ui % 3)
        members = [email]
        for k in range(1, target):
            members.append(emails[(ui + k) % n_users])
        status = gb_statuses[ui % len(gb_statuses)]
        group_buy_specs.append((email, ext, target, members, status))

    collection_specs: list[tuple[str, str, str]] = []
    for ui, email in enumerate(emails):
        base = ui * (_COLLECTION_COLLECTED + _COLLECTION_WISHLIST)
        for j in range(_COLLECTION_COLLECTED):
            p = products[(base + j) % n_products]
            collection_specs.append((email, str(p["external_id"]), "collected"))
        for j in range(_COLLECTION_WISHLIST):
            p = products[(base + _COLLECTION_COLLECTED + j) % n_products]
            collection_specs.append((email, str(p["external_id"]), "wishlist"))

    notification_specs: list[tuple[str, str, str, str, bool]] = []
    notif_titles = [
        ("system", "歡迎回來 BlindBox", "帳號已就緒，開始探索圖鑑。"),
        ("trade", "新訂單通知", "有人對你的商品下單了。"),
        ("trade", "訂單狀態更新", "賣家已標記為已出貨。"),
        ("activity", "本週熱門 IP", "LABUBU 系列熱度上升。"),
        ("trade", "交換提案", "你收到一則交換提案。"),
        ("support", "客服回覆", "我們已收到你的問題。"),
        ("trade", "評價邀請", "訂單已完成，歡迎留下評價。"),
        ("activity", "收藏提醒", "想收清單內有商品降價了。"),
    ]
    for ui, email in enumerate(emails):
        for j in range(_NOTIFICATIONS_PER_USER):
            ntype, title, body = notif_titles[j % len(notif_titles)]
            is_read = (ui + j) % 3 == 0
            notification_specs.append(
                (email, ntype, title, f"{RICH_DEMO_MARKER} {body}", is_read)
            )

    return RichSeedBundle(
        user_ids=user_ids,
        listing_specs=listing_specs,
        cart_specs=cart_specs,
        order_specs=order_specs,
        chat_specs=chat_specs,
        message_specs=message_specs,
        message_read_specs=message_read_specs,
        swap_specs=swap_specs,
        split_box_specs=split_box_specs,
        group_buy_specs=group_buy_specs,
        collection_specs=collection_specs,
        notification_specs=notification_specs,
    )
