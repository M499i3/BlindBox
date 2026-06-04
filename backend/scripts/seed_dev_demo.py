#!/usr/bin/env python3
"""
開發用 demo 資料：3 位測試使用者、上架、購物車、訂單、聊天、通知等。

需先執行 npm run db:seed（圖鑑 + user1）。

用法：
  python3 backend/scripts/seed_dev_demo.py
  python3 backend/scripts/seed_dev_demo.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from auth_util import hash_password  # noqa: E402
from demo_seed_lib import (  # noqa: E402
    CHAT_SPECS as LEGACY_CHAT_SPECS,
    COLLECTION_SPECS as LEGACY_COLLECTION_SPECS,
    DEMO_MARKER,
    DEMO_USERS as LEGACY_DEMO_USERS,
    LISTING_SPECS as LEGACY_LISTING_SPECS,
    MESSAGE_SPECS,
    NOTIFICATION_SPECS,
    ORDER_STATUS_SPECS as LEGACY_ORDER_STATUS_SPECS,
)


def _pg_url() -> str:
    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_users(
    cur, demo_users: list[tuple[str, str]] | None = None
) -> dict[str, str]:
    ids: dict[str, str] = {}
    pw = hash_password()
    users = demo_users or LEGACY_DEMO_USERS
    for email, name in users:
        cur.execute(
            """
            INSERT INTO users (display_name, email, password_hash)
            VALUES (%s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                password_hash = EXCLUDED.password_hash,
                updated_at = now()
            RETURNING id
            """,
            (name, email, pw),
        )
        row = cur.fetchone()
        assert row
        ids[email] = str(row["id"])
    return ids


def purge_demo(cur, user_ids: dict[str, str]) -> None:
    uids = list(user_ids.values())
    cur.execute(
        """
        DELETE FROM user_ratings
        WHERE order_id IN (
            SELECT o.id FROM orders o
            JOIN listings l ON l.id = o.listing_id
            WHERE l.description LIKE %s
        )
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        """
        DELETE FROM messages
        WHERE chat_id IN (
            SELECT c.id FROM chats c
            JOIN listings l ON l.id = c.listing_id
            WHERE l.description LIKE %s
        )
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        """
        DELETE FROM chat_participants
        WHERE chat_id IN (
            SELECT c.id FROM chats c
            JOIN listings l ON l.id = c.listing_id
            WHERE l.description LIKE %s
        )
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        """
        DELETE FROM chats
        WHERE listing_id IN (
            SELECT id FROM listings WHERE description LIKE %s
        )
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        """
        DELETE FROM orders
        WHERE listing_id IN (SELECT id FROM listings WHERE description LIKE %s)
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        """
        DELETE FROM cart_items
        WHERE listing_id IN (SELECT id FROM listings WHERE description LIKE %s)
           OR user_id = ANY(%s::uuid[])
        """,
        (f"%{DEMO_MARKER}%", uids),
    )
    cur.execute(
        "DELETE FROM notifications WHERE user_id = ANY(%s::uuid[])",
        (uids,),
    )
    cur.execute(
        "DELETE FROM user_collections WHERE user_id = ANY(%s::uuid[])",
        (uids,),
    )
    cur.execute(
        """
        DELETE FROM listing_images
        WHERE listing_id IN (SELECT id FROM listings WHERE description LIKE %s)
        """,
        (f"%{DEMO_MARKER}%",),
    )
    cur.execute(
        "DELETE FROM listings WHERE description LIKE %s",
        (f"%{DEMO_MARKER}%",),
    )


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


def seed_listings(
    cur, user_ids: dict[str, str], listing_specs: list[tuple[str, str, str, str, bool, int]]
) -> dict[str, str]:
    """Returns map external_id -> listing_id for seller's listing."""
    listing_by_ext: dict[str, str] = {}
    for seller_email, ext_id, trade_mode, condition, allow_swap, price_cents in listing_specs:
        cat = fetch_catalog(cur, ext_id)
        if not cat:
            print(f"⚠️  略過 listing：找不到 catalog external_id={ext_id}")
            continue
        seller_id = user_ids[seller_email]
        listing_id = str(uuid.uuid4())
        title = f"{DEMO_MARKER} {cat['title']}"
        desc = f"{DEMO_MARKER} 開發用示意上架，關聯圖鑑 {ext_id}。"
        cur.execute(
            """
            INSERT INTO listings (
                id, seller_id, catalog_product_id, brand_id, series_id,
                title, item_name, description, price_amount, price_currency,
                condition, trade_mode, shipping_method,
                allow_swap, allow_bargain, status, view_count, like_count
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, 'TWD',
                %s::listing_condition_enum,
                %s::trade_mode_enum,
                '711_store'::shipping_method_enum,
                %s, %s, 'active', %s, %s
            )
            """,
            (
                listing_id,
                seller_id,
                cat["id"],
                cat.get("brand_id"),
                cat.get("series_id"),
                title[:200],
                cat["title"][:120],
                desc,
                price_cents // 100 if price_cents else 0,
                condition,
                trade_mode,
                allow_swap,
                allow_swap,
                (hash(ext_id) % 80) + 5,
                (hash(ext_id) % 20),
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
        key = f"{seller_email}:{ext_id}"
        listing_by_ext[key] = listing_id
        listing_by_ext[ext_id] = listing_id
    return listing_by_ext


def resolve_listing(
    listing_map: dict[str, str],
    seller_email: str,
    ext_id: str,
) -> str | None:
    return listing_map.get(f"{seller_email}:{ext_id}") or listing_map.get(ext_id)


def seed_cart(
    cur,
    user_ids: dict[str, str],
    listing_map: dict[str, str],
    cart_specs: list[tuple[str, str, str]],
) -> None:
    for buyer_email, seller_email, ext_id in cart_specs:
        buyer = user_ids.get(buyer_email)
        if not buyer:
            continue
        lid = resolve_listing(listing_map, seller_email, ext_id)
        if not lid:
            continue
        cur.execute(
            """
            INSERT INTO cart_items (user_id, listing_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, listing_id) DO NOTHING
            """,
            (buyer, lid),
        )


def seed_orders(
    cur,
    user_ids: dict[str, str],
    listing_map: dict[str, str],
    order_specs: list[tuple[str, str, str, str]],
) -> list[str]:
    completed_ids: list[str] = []
    base = _now()
    for i, (buyer_email, seller_email, ext_id, status) in enumerate(order_specs):
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
        created = base - timedelta(days=10 - i)
        cur.execute(
            """
            INSERT INTO orders (
                listing_id, buyer_id, seller_id, status,
                amount, currency, shipping_method, created_at, updated_at,
                paid_at, shipped_at, completed_at
            ) VALUES (
                %s, %s, %s, %s::order_status_enum,
                %s, %s, %s, %s, %s,
                %s, %s, %s
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
                created if status != "pending" else None,
                created if status in ("shipped", "completed") else None,
                created if status == "completed" else None,
            ),
        )
        oid = str(cur.fetchone()["id"])
        if status == "completed":
            completed_ids.append(oid)
    return completed_ids


def seed_chats_and_messages(
    cur,
    user_ids: dict[str, str],
    listing_map: dict[str, str],
    chat_specs: list[tuple[str, str, str, str, str]],
) -> None:
    base = _now()
    chat_ids: list[str] = []
    for p1_email, p2_email, seller_email, ext_id, chat_status in chat_specs:
        lid = resolve_listing(listing_map, seller_email, ext_id)
        if not lid:
            continue
        seller_id = user_ids[seller_email]
        buyer_id = user_ids[p2_email] if seller_email == p1_email else user_ids[p1_email]
        chat_id = str(uuid.uuid4())
        last_preview = ""
        cur.execute(
            """
            INSERT INTO chats (
                id, listing_id, buyer_id, seller_id, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s::chat_status_enum, %s, %s)
            """,
            (chat_id, lid, buyer_id, seller_id, chat_status, base, base),
        )
        chat_ids.append(chat_id)
        for email in (p1_email, p2_email):
            unread = 2 if email == "user2@test.com" and chat_status == "swapping" else 0
            cur.execute(
                """
                INSERT INTO chat_participants (chat_id, user_id, unread_count)
                VALUES (%s, %s, %s)
                ON CONFLICT (chat_id, user_id) DO UPDATE SET unread_count = EXCLUDED.unread_count
                """,
                (chat_id, user_ids[email], unread),
            )
        msgs = [m for m in MESSAGE_SPECS if m[0] == len(chat_ids) - 1]
        for j, (_, sender_email, content) in enumerate(msgs):
            ts = base - timedelta(hours=5 - j)
            cur.execute(
                """
                INSERT INTO messages (chat_id, sender_id, type, content, created_at)
                VALUES (%s, %s, 'text', %s, %s)
                """,
                (chat_id, user_ids[sender_email], content, ts),
            )
            last_preview = content
        cur.execute(
            """
            UPDATE chats SET last_message_preview = %s, last_message_at = %s WHERE id = %s
            """,
            (last_preview[:200], base, chat_id),
        )


def seed_notifications(cur, user_ids: dict[str, str]) -> None:
    base = _now()
    for i, (email, ntype, title, body, is_read) in enumerate(NOTIFICATION_SPECS):
        cur.execute(
            """
            INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
            VALUES (%s, %s::notification_type_enum, %s, %s, %s, %s)
            """,
            (
                user_ids[email],
                ntype,
                f"{DEMO_MARKER} {title}",
                body,
                is_read,
                base - timedelta(hours=i),
            ),
        )


def seed_collections(
    cur, user_ids: dict[str, str], collection_specs: list[tuple[str, str, str]]
) -> None:
    for email, ext_id, ctype in collection_specs:
        cat = fetch_catalog(cur, ext_id)
        if not cat:
            continue
        cur.execute(
            """
            INSERT INTO user_collections (user_id, catalog_product_id, type)
            VALUES (%s, %s, %s::collection_type_enum)
            ON CONFLICT (user_id, catalog_product_id, type) DO NOTHING
            """,
            (user_ids[email], cat["id"], ctype),
        )


def seed_ratings(cur, user_ids: dict[str, str], completed_order_ids: list[str]) -> None:
    if not completed_order_ids:
        return
    oid = completed_order_ids[0]
    cur.execute(
        "SELECT buyer_id, seller_id FROM orders WHERE id = %s",
        (oid,),
    )
    row = cur.fetchone()
    if not row:
        return
    buyer_id = str(row["buyer_id"])
    seller_id = str(row["seller_id"])
    for rater_id, ratee_id, score in [
        (buyer_id, seller_id, 5),
        (seller_id, buyer_id, 4),
    ]:
        cur.execute(
            """
            INSERT INTO user_ratings (order_id, rater_id, ratee_id, score, comment)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (order_id, rater_id) DO NOTHING
            """,
            (oid, rater_id, ratee_id, score, f"{DEMO_MARKER} 交易順利"),
        )


def run_seed(
    *,
    dry_run: bool,
    koca_bundle: dict | None = None,
) -> None:
    if koca_bundle:
        from koca_demo_lib import DEMO_USERS

        demo_users = DEMO_USERS
        listing_specs = koca_bundle["listing_specs"]
        order_specs = koca_bundle["order_specs"]
        cart_specs = koca_bundle["cart_specs"]
        chat_specs = koca_bundle["chat_specs"]
        collection_specs = koca_bundle["collection_specs"]
    else:
        demo_users = LEGACY_DEMO_USERS
        listing_specs = LEGACY_LISTING_SPECS
        order_specs = LEGACY_ORDER_STATUS_SPECS
        cart_specs = [
            ("user2@test.com", "user1@test.com", "2084"),
            ("user2@test.com", "user3@test.com", "2067"),
        ]
        chat_specs = LEGACY_CHAT_SPECS
        collection_specs = LEGACY_COLLECTION_SPECS
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit("缺少 psycopg2，請先 pip install -r backend/requirements.txt") from e

    if dry_run:
        print("[dry-run] 將寫入 demo 使用者與關聯資料（略過 DB）")
        return

    conn = psycopg2.connect(_pg_url())
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT COUNT(*) AS n FROM catalog_products")
                if (cur.fetchone() or {}).get("n", 0) == 0:
                    raise SystemExit("catalog_products 為空，請先執行 npm run db:seed")

                user_ids = upsert_users(cur, demo_users)
                if not koca_bundle:
                    purge_demo(cur, user_ids)
                listing_map = seed_listings(cur, user_ids, listing_specs)
                print(f"   上架 {len(listing_specs)} 筆（含 [demo] 標記）")
                seed_cart(cur, user_ids, listing_map, cart_specs)
                completed = seed_orders(cur, user_ids, listing_map, order_specs)
                seed_chats_and_messages(cur, user_ids, listing_map, chat_specs)
                seed_notifications(cur, user_ids)
                seed_collections(cur, user_ids, collection_specs)
                seed_ratings(cur, user_ids, completed)

        print("✅ demo seed 完成")
        print("   測試帳號（密碼皆為 password）：")
        for email, name in demo_users:
            print(f"   - {email} ({name}) → {user_ids[email]}")
        print(f"   建議 .env：VITE_DEV_USER_ID={user_ids['user1@test.com']}")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="BlindBox dev demo seed")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--koca",
        action="store_true",
        help="使用 KOCA 圖鑑產生 200 筆 demo 上架（需先 db:seed:koca）",
    )
    args = parser.parse_args()
    koca_bundle = None
    if args.koca:
        from koca_demo_lib import build_koca_demo_bundle

        koca_json = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"
        if not koca_json.is_file():
            raise SystemExit(f"找不到 {koca_json}")
        koca_bundle = build_koca_demo_bundle(koca_json)
    run_seed(dry_run=args.dry_run, koca_bundle=koca_bundle)


if __name__ == "__main__":
    main()
