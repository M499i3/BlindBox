#!/usr/bin/env python3
"""寫入使用者、市集、交易、社交等種子（需先有 catalog_products）。"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from auth_util import hash_password  # noqa: E402
from app_seed_lib import (  # noqa: E402
    CART_SPECS,
    CHAT_SPECS,
    COLLECTION_SPECS,
    GROUP_BUY_SPECS,
    LISTING_SPECS,
    MESSAGE_READ_SPECS,
    MESSAGE_SPECS,
    NOTIFICATION_SPECS,
    ORDER_SPECS,
    SEED_MARKER,
    SEED_USERS,
    SPLIT_BOX_SPECS,
    SWAP_SPECS,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def insert_users(cur) -> dict[str, str]:
    pw = hash_password()
    ids: dict[str, str] = {}
    for email, name in SEED_USERS:
        cur.execute(
            """
            INSERT INTO users (display_name, email, password_hash, bio, avatar_url)
            VALUES (%s, %s, %s, %s, NULL)
            RETURNING id
            """,
            (
                name,
                email,
                pw,
                f"{SEED_MARKER} 測試帳號，密碼 password。",
            ),
        )
        row = cur.fetchone()
        assert row
        ids[email] = str(row["id"])
    return ids


def fetch_catalog(cur, external_id: str) -> dict | None:
    cur.execute(
        """
        SELECT cp.id, cp.title, cp.image_url, cp.series_id, s.brand_id
        FROM catalog_products cp
        LEFT JOIN series s ON s.id = cp.series_id
        WHERE cp.external_id = %s
        LIMIT 1
        """,
        (external_id,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def seed_listings(cur, user_ids: dict[str, str]) -> dict[str, str]:
    """key: seller_email:external_id 與 external_id -> listing_id"""
    listing_map: dict[str, str] = {}
    for seller_email, ext_id, trade_mode, condition, allow_swap, price_cents in LISTING_SPECS:
        cat = fetch_catalog(cur, ext_id)
        if not cat:
            raise SystemExit(f"找不到圖鑑商品 external_id={ext_id}，請先匯入 showcase JSON")
        listing_id = str(uuid.uuid4())
        title = f"{cat['title']}"
        desc = f"{SEED_MARKER} 示意上架，圖鑑 {ext_id}。"
        cur.execute(
            """
            INSERT INTO listings (
                id, seller_id, catalog_product_id, brand_id, series_id,
                title, item_name, description, price_amount, price_currency,
                condition, trade_mode, shipping_method,
                allow_swap, allow_bargain, status, view_count, like_count,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, 'TWD',
                %s::listing_condition_enum,
                %s::trade_mode_enum,
                '711_store'::shipping_method_enum,
                %s, %s, 'active', %s, %s,
                %s, %s
            )
            """,
            (
                listing_id,
                user_ids[seller_email],
                cat["id"],
                cat.get("brand_id"),
                cat.get("series_id"),
                title[:200],
                cat["title"][:120],
                desc,
                price_cents,
                condition,
                trade_mode,
                allow_swap,
                allow_swap,
                (hash(ext_id) % 120) + 10,
                (hash(ext_id) % 25),
                _now() - timedelta(days=hash(ext_id) % 14),
                _now(),
            ),
        )
        if cat.get("image_url"):
            cur.execute(
                """
                INSERT INTO listing_images (listing_id, url, sort_order)
                VALUES (%s, %s, 0)
                """,
                (listing_id, cat["image_url"]),
            )
        listing_map[f"{seller_email}:{ext_id}"] = listing_id
        listing_map[ext_id] = listing_id
    return listing_map


def resolve_listing(
    listing_map: dict[str, str], seller_email: str, ext_id: str
) -> str | None:
    return listing_map.get(f"{seller_email}:{ext_id}") or listing_map.get(ext_id)


def seed_cart(cur, user_ids: dict[str, str], listing_map: dict[str, str]) -> int:
    n = 0
    for buyer_email, seller_email, ext_id in CART_SPECS:
        lid = resolve_listing(listing_map, seller_email, ext_id)
        if not lid:
            continue
        cur.execute(
            """
            INSERT INTO cart_items (user_id, listing_id, added_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, listing_id) DO NOTHING
            """,
            (user_ids[buyer_email], lid, _now() - timedelta(hours=n)),
        )
        n += 1
    return n


def seed_orders(cur, user_ids: dict[str, str], listing_map: dict[str, str]) -> list[str]:
    completed: list[str] = []
    base = _now()
    for i, (buyer_email, seller_email, ext_id, status) in enumerate(ORDER_SPECS):
        lid = resolve_listing(listing_map, seller_email, ext_id)
        if not lid:
            continue
        cur.execute(
            "SELECT price_amount, price_currency, shipping_method FROM listings WHERE id = %s",
            (lid,),
        )
        row = cur.fetchone()
        amount = row["price_amount"] if row else 0
        currency = row["price_currency"] if row else "TWD"
        shipping = row["shipping_method"] if row else "711_store"
        created = base - timedelta(days=20 - i)
        cur.execute(
            """
            INSERT INTO orders (
                listing_id, buyer_id, seller_id, status,
                amount, currency, shipping_method,
                created_at, updated_at, paid_at, shipped_at, completed_at
            ) VALUES (
                %s, %s, %s, %s::order_status_enum,
                %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                lid,
                user_ids[buyer_email],
                user_ids[seller_email],
                status,
                amount,
                currency,
                shipping,
                created,
                created,
                created if status != "pending_payment" else None,
                created if status in ("shipped", "completed", "delivered") else None,
                created if status == "completed" else None,
            ),
        )
        oid = str(cur.fetchone()["id"])
        if status == "completed":
            completed.append(oid)
    return completed


def seed_chats_messages(
    cur, user_ids: dict[str, str], listing_map: dict[str, str]
) -> tuple[list[str], dict[int, list[str]]]:
    """回傳 chat_ids 與 chat_index -> message_ids"""
    base = _now()
    chat_ids: list[str] = []
    messages_by_chat: dict[int, list[str]] = {}

    for idx, (buyer_email, seller_email, ext_id, chat_status) in enumerate(CHAT_SPECS):
        lid = resolve_listing(listing_map, seller_email, ext_id)
        if not lid:
            continue
        chat_id = str(uuid.uuid4())
        chat_ids.append(chat_id)
        messages_by_chat[idx] = []
        cur.execute(
            """
            INSERT INTO chats (
                id, listing_id, buyer_id, seller_id, status, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s::chat_status_enum, %s, %s)
            """,
            (
                chat_id,
                lid,
                user_ids[buyer_email],
                user_ids[seller_email],
                chat_status,
                base - timedelta(days=idx + 1),
                base,
            ),
        )
        for email in (buyer_email, seller_email):
            unread = 1 if email == buyer_email and chat_status == "swapping" else 0
            cur.execute(
                """
                INSERT INTO chat_participants (chat_id, user_id, unread_count, last_read_at)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    chat_id,
                    user_ids[email],
                    unread,
                    base if unread == 0 else None,
                ),
            )

        last_preview = ""
        for j, (_, sender_email, content) in enumerate(
            [m for m in MESSAGE_SPECS if m[0] == idx]
        ):
            msg_id = str(uuid.uuid4())
            ts = base - timedelta(hours=8 - j)
            cur.execute(
                """
                INSERT INTO messages (id, chat_id, sender_id, type, content, created_at)
                VALUES (%s, %s, %s, 'text', %s, %s)
                """,
                (msg_id, chat_id, user_ids[sender_email], content, ts),
            )
            messages_by_chat[idx].append(msg_id)
            last_preview = content

        cur.execute(
            """
            UPDATE chats
            SET last_message_preview = %s, last_message_at = %s
            WHERE id = %s
            """,
            (last_preview[:200], base, chat_id),
        )

    return chat_ids, messages_by_chat


def seed_message_reads(
    cur,
    user_ids: dict[str, str],
    messages_by_chat: dict[int, list[str]],
) -> None:
    for chat_idx, reader_email in MESSAGE_READ_SPECS:
        msg_ids = messages_by_chat.get(chat_idx, [])
        if not msg_ids:
            continue
        # 標記該聊天最後一則為已讀
        mid = msg_ids[-1]
        cur.execute(
            """
            INSERT INTO message_reads (message_id, user_id, read_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (message_id, user_id) DO NOTHING
            """,
            (mid, user_ids[reader_email], _now()),
        )


def seed_swap_proposals(
    cur,
    user_ids: dict[str, str],
    listing_map: dict[str, str],
    chat_ids: list[str],
) -> None:
    for i, spec in enumerate(SWAP_SPECS):
        (
            proposer_email,
            receiver_email,
            off_seller,
            off_ext,
            want_seller,
            want_ext,
            status,
            extra_cents,
        ) = spec
        offered_id = resolve_listing(listing_map, off_seller, off_ext)
        wanted_id = resolve_listing(listing_map, want_seller, want_ext)
        if not offered_id or not wanted_id:
            continue
        chat_id = chat_ids[i] if i < len(chat_ids) else chat_ids[0]
        cur.execute(
            """
            INSERT INTO swap_proposals (
                chat_id, proposer_id, receiver_id,
                offered_listing_id, wanted_listing_id,
                additional_amount, additional_currency,
                message, status, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, 'TWD', %s,
                %s::swap_proposal_status_enum, %s, %s
            )
            """,
            (
                chat_id,
                user_ids[proposer_email],
                user_ids[receiver_email],
                offered_id,
                wanted_id,
                extra_cents,
                f"{SEED_MARKER} 交換提案",
                status,
                _now() - timedelta(days=2),
                _now(),
            ),
        )


def seed_split_boxes(cur, user_ids: dict[str, str]) -> tuple[int, int]:
    """建立拆盒團、格位，並為可認領款式建立 group_buy 上架。"""
    base = _now()
    group_count = 0
    slot_count = 0

    for (
        organizer_email,
        group_status,
        primary_ext,
        slot_defs,
        claim_defs,
    ) in SPLIT_BOX_SPECS:
        primary = fetch_catalog(cur, primary_ext)
        if not primary:
            continue
        organizer_id = user_ids[organizer_email]
        group_id = str(uuid.uuid4())
        target_count = len(slot_defs)
        reserved_count = sum(1 for _, host in slot_defs if host)
        claim_map = {ext: email for ext, email in claim_defs}
        claimed_count = len(claim_map)
        price_per_slot = 45000
        total_price = price_per_slot * max(1, target_count - reserved_count)
        title = f"{SEED_MARKER} {primary['title'][:36]} 拆盒團"

        shipped_at = base - timedelta(days=1) if group_status == "shipping" else None
        if group_status == "completed":
            shipped_at = base - timedelta(days=3)

        cur.execute(
            """
            INSERT INTO split_box_groups (
                id, organizer_id, brand_id, series_id, title, description, cover_image,
                status, shipping_method, shipping_note,
                total_price_amount, price_per_slot_amount,
                target_count, reserved_count, claimed_count,
                closes_at, shipped_at, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s::split_box_status_enum,
                '711_store'::shipping_method_enum, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            """,
            (
                group_id,
                organizer_id,
                primary.get("brand_id"),
                primary.get("series_id"),
                title,
                f"{SEED_MARKER} 示意拆盒團，主系列來自圖鑑 {primary_ext}。",
                primary.get("image_url"),
                group_status,
                "7-11 店到店",
                total_price,
                price_per_slot,
                target_count,
                reserved_count,
                claimed_count,
                base + timedelta(days=7),
                shipped_at,
                base - timedelta(days=5),
                base,
            ),
        )
        group_count += 1

        for ext_id, reserved_by_host in slot_defs:
            cat = fetch_catalog(cur, ext_id)
            if not cat:
                continue
            slot_id = str(uuid.uuid4())
            claimer_email = claim_map.get(ext_id)
            if reserved_by_host:
                slot_status = "reserved"
                claimed_by = None
                claimed_at = None
            elif claimer_email:
                slot_status = "claimed"
                claimed_by = user_ids.get(claimer_email)
                claimed_at = base - timedelta(days=2)
            else:
                slot_status = "available"
                claimed_by = None
                claimed_at = None

            # 先寫入 slot（listings.split_box_slot_id FK 需要 slot 已存在）
            cur.execute(
                """
                INSERT INTO split_box_slots (
                    id, group_id, catalog_product_external_id, product_title, product_image,
                    listing_id, reserved_by_host, claimed_by_user_id, claimed_at,
                    price_amount, status
                ) VALUES (%s, %s, %s, %s, %s, NULL, %s, %s, %s, %s, %s)
                """,
                (
                    slot_id,
                    group_id,
                    ext_id,
                    cat["title"],
                    cat.get("image_url"),
                    reserved_by_host,
                    claimed_by,
                    claimed_at,
                    price_per_slot,
                    slot_status,
                ),
            )
            slot_count += 1

            if not reserved_by_host:
                listing_id = str(uuid.uuid4())
                list_title = f"{title} · {cat['title'][:40]}"
                cur.execute(
                    """
                    INSERT INTO listings (
                        id, seller_id, catalog_product_id, brand_id, series_id,
                        title, item_name, description, price_amount, price_currency,
                        condition, trade_mode, shipping_method,
                        allow_swap, allow_bargain, status,
                        split_box_group_id, split_box_slot_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, 'TWD',
                        'sealed'::listing_condition_enum,
                        'group_buy'::trade_mode_enum,
                        '711_store'::shipping_method_enum,
                        false, false, 'active',
                        %s, %s, %s, %s
                    )
                    """,
                    (
                        listing_id,
                        organizer_id,
                        cat["id"],
                        cat.get("brand_id"),
                        cat.get("series_id"),
                        list_title[:200],
                        cat["title"][:120],
                        f"{SEED_MARKER} 拆盒團認領款式",
                        price_per_slot,
                        group_id,
                        slot_id,
                        base - timedelta(days=4),
                        base,
                    ),
                )
                if cat.get("image_url"):
                    cur.execute(
                        """
                        INSERT INTO listing_images (listing_id, url, sort_order)
                        VALUES (%s, %s, 0)
                        """,
                        (listing_id, cat["image_url"]),
                    )
                cur.execute(
                    "UPDATE split_box_slots SET listing_id = %s WHERE id = %s",
                    (listing_id, slot_id),
                )

    return group_count, slot_count


def seed_group_buys(cur, user_ids: dict[str, str]) -> None:
    for organizer_email, ext_id, target, members, status in GROUP_BUY_SPECS:
        cat = fetch_catalog(cur, ext_id)
        if not cat:
            continue
        cur.execute(
            """
            INSERT INTO group_buys (
                catalog_product_id, organizer_id, target_count, current_count,
                status, description, price_per_slot_amount, price_per_slot_currency,
                created_at, closes_at
            ) VALUES (
                %s, %s, %s, %s,
                %s::group_buy_status_enum, %s, %s, 'TWD',
                %s, %s
            )
            RETURNING id
            """,
            (
                cat["id"],
                user_ids[organizer_email],
                target,
                len(members) if status == "full" else len(members) - 1,
                status,
                f"{SEED_MARKER} 拆盒團 — {cat['title'][:40]}",
                45000,
                _now() - timedelta(days=3),
                _now() + timedelta(days=7),
            ),
        )
        gb_id = str(cur.fetchone()["id"])
        for slot, member_email in enumerate(members, start=1):
            cur.execute(
                """
                INSERT INTO group_buy_members (group_buy_id, user_id, slot_number, joined_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (group_buy_id, user_id) DO NOTHING
                """,
                (gb_id, user_ids[member_email], slot, _now() - timedelta(days=2)),
            )


def seed_collections(cur, user_ids: dict[str, str]) -> None:
    for email, ext_id, ctype in COLLECTION_SPECS:
        cat = fetch_catalog(cur, ext_id)
        if not cat:
            continue
        cur.execute(
            """
            INSERT INTO user_collections (user_id, catalog_product_id, type, note)
            VALUES (%s, %s, %s::collection_type_enum, %s)
            ON CONFLICT (user_id, catalog_product_id, type) DO NOTHING
            """,
            (user_ids[email], cat["id"], ctype, SEED_MARKER),
        )


def seed_notifications(cur, user_ids: dict[str, str]) -> None:
    base = _now()
    for i, (email, ntype, title, body, is_read) in enumerate(NOTIFICATION_SPECS):
        cur.execute(
            """
            INSERT INTO notifications (user_id, type, title, body, is_read, created_at, read_at)
            VALUES (%s, %s::notification_type_enum, %s, %s, %s, %s, %s)
            """,
            (
                user_ids[email],
                ntype,
                title,
                body,
                is_read,
                base - timedelta(hours=i),
                base - timedelta(hours=i) if is_read else None,
            ),
        )


def seed_ratings(cur, user_ids: dict[str, str], completed_order_ids: list[str]) -> None:
    scores = [5, 4, 5, 4, 5]
    for i, oid in enumerate(completed_order_ids[:5]):
        cur.execute(
            "SELECT buyer_id, seller_id FROM orders WHERE id = %s",
            (oid,),
        )
        row = cur.fetchone()
        if not row:
            continue
        buyer_id = str(row["buyer_id"])
        seller_id = str(row["seller_id"])
        sc = scores[i % len(scores)]
        for rater_id, ratee_id, s in [
            (buyer_id, seller_id, sc),
            (seller_id, buyer_id, max(3, sc - 1)),
        ]:
            cur.execute(
                """
                INSERT INTO user_ratings (order_id, rater_id, ratee_id, score, comment)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (order_id, rater_id) DO NOTHING
                """,
                (oid, rater_id, ratee_id, s, f"{SEED_MARKER} 交易順利"),
            )


def sync_user_stats(cur) -> None:
    cur.execute(
        """
        UPDATE users u SET
            transaction_count = COALESCE(sub.tc, 0),
            rating_count = COALESCE(sub.rc, 0),
            rating_avg = COALESCE(sub.avg, 0),
            updated_at = now()
        FROM (
            SELECT
                u2.id AS user_id,
                (
                    SELECT COUNT(*)::int FROM orders o
                    WHERE (o.buyer_id = u2.id OR o.seller_id = u2.id)
                      AND o.status = 'completed' AND o.deleted_at IS NULL
                ) AS tc,
                (
                    SELECT COUNT(*)::int FROM user_ratings ur
                    WHERE ur.ratee_id = u2.id
                ) AS rc,
                (
                    SELECT ROUND(AVG(ur.score)::numeric, 2) FROM user_ratings ur
                    WHERE ur.ratee_id = u2.id
                ) AS avg
            FROM users u2
        ) sub
        WHERE u.id = sub.user_id
        """
    )


def run_app_seed(cur) -> dict[str, int]:
    user_ids = insert_users(cur)
    listing_map = seed_listings(cur, user_ids)
    cart_n = seed_cart(cur, user_ids, listing_map)
    completed = seed_orders(cur, user_ids, listing_map)
    chat_ids, messages_by_chat = seed_chats_messages(cur, user_ids, listing_map)
    seed_message_reads(cur, user_ids, messages_by_chat)
    seed_swap_proposals(cur, user_ids, listing_map, chat_ids)
    split_groups, split_slots = seed_split_boxes(cur, user_ids)
    seed_group_buys(cur, user_ids)
    seed_collections(cur, user_ids)
    seed_notifications(cur, user_ids)
    seed_ratings(cur, user_ids, completed)
    sync_user_stats(cur)

    return {
        "users": len(user_ids),
        "listings": len(LISTING_SPECS),
        "cart_items": cart_n,
        "orders": len(ORDER_SPECS),
        "chats": len(chat_ids),
        "swap_proposals": len(SWAP_SPECS),
        "split_box_groups": split_groups,
        "split_box_slots": split_slots,
        "group_buys": len(GROUP_BUY_SPECS),
        "notifications": len(NOTIFICATION_SPECS),
        "collections": len(COLLECTION_SPECS),
        "ratings_orders": min(5, len(completed)),
    }
