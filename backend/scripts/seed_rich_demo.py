#!/usr/bin/env python3
"""
為每位使用者寫入豐富的假資料（市集、交易、社交、拆盒團、收藏、評價等）。

需先有 KOCA 盲盒圖鑑（npm run db:seed 或 db:seed:replace）。

用法（專案根目錄）：
  npm run db:seed:rich
  npm run db:seed:rich -- --purge          # 先清市集再寫入
  npm run db:seed:rich -- --dry-run

  python3 backend/scripts/seed_rich_demo.py
  python3 backend/scripts/seed_rich_demo.py --purge
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from marketplace_purge_lib import purge_marketplace_only  # noqa: E402
from rich_demo_seed_lib import (  # noqa: E402
    RICH_DEMO_MARKER,
    build_rich_seed_bundle,
    ensure_seed_users,
    load_catalog_products,
)
from seed_app_data import run_app_seed  # noqa: E402

TABLE_COUNTS = [
    "users",
    "listings",
    "listing_images",
    "cart_items",
    "orders",
    "user_ratings",
    "chats",
    "chat_participants",
    "messages",
    "message_reads",
    "swap_proposals",
    "split_box_groups",
    "split_box_slots",
    "group_buys",
    "group_buy_members",
    "user_collections",
    "notifications",
]


def _pg_url() -> str:
    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def _count(cur, table: str) -> int:
    cur.execute(f"SELECT COUNT(*)::int AS n FROM {table}")
    row = cur.fetchone()
    return int(row["n"]) if row else 0


def _users_missing_rows(cur, user_ids: dict[str, str]) -> list[str]:
    """檢查每位使用者是否在主要表都有至少一筆。"""
    uids = list(user_ids.values())
    checks = [
        ("listings", "seller_id"),
        ("cart_items", "user_id"),
        ("orders (buyer)", "buyer_id"),
        ("orders (seller)", "seller_id"),
        ("user_collections", "user_id"),
        ("notifications", "user_id"),
        ("chat_participants", "user_id"),
    ]
    missing: list[str] = []
    for label, col in checks:
        for email, uid in user_ids.items():
            if email.startswith("system@"):
                continue
            cur.execute(
                f"SELECT 1 FROM {label.split()[0]} WHERE {col} = %s LIMIT 1",
                (uid,),
            )
            if not cur.fetchone():
                missing.append(f"{email}: 無 {label}")
    return missing


def run(*, dry_run: bool, purge: bool) -> None:
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit(
            "缺少 psycopg2。請執行：cd backend && pip install -r requirements.txt"
        ) from e

    conn = psycopg2.connect(_pg_url(), cursor_factory=RealDictCursor)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*)::int AS n FROM catalog_products")
            n_cat = int((cur.fetchone() or {}).get("n", 0))
            if n_cat == 0:
                raise SystemExit("catalog_products 為空，請先執行 npm run db:seed")

            user_ids = ensure_seed_users(cur)
            products = load_catalog_products(cur, limit=600)
            bundle = build_rich_seed_bundle(user_ids, products)

            print(f"標記：{RICH_DEMO_MARKER}")
            print(f"使用者：{len(user_ids)} 位")
            print(f"圖鑑池：{len(products)} 筆")
            print(
                f"將寫入 ≈ {len(bundle.listing_specs)} 上架、"
                f"{len(bundle.order_specs)} 訂單、"
                f"{len(bundle.collection_specs)} 收藏、"
                f"{len(bundle.notification_specs)} 通知、"
                f"{len(bundle.chat_specs)} 聊天、"
                f"{len(bundle.swap_specs)} 交換提案、"
                f"{len(bundle.split_box_specs)} 拆盒團"
            )

            if dry_run:
                print("[dry-run] 略過資料庫寫入")
                return

        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if purge:
                    purge_marketplace_only(cur)

                stats = run_app_seed(cur, bundle)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_ids = ensure_seed_users(cur)
            print("\n✅ rich demo 完成")
            for k, v in stats.items():
                print(f"   {k}: {v}")
            print("\n各表筆數：")
            for table in TABLE_COUNTS:
                print(f"   {table}: {_count(cur, table)}")

            gaps = _users_missing_rows(cur, user_ids)
            if gaps:
                print("\n⚠️  部分使用者缺少資料：")
                for g in gaps[:20]:
                    print(f"   {g}")
            else:
                print("\n每位使用者在主要表皆有資料。")

            print("\n測試帳號（密碼 password）：")
            for email, name in [
                ("user1@test.com", "Yu"),
                ("user2@test.com", "Mina_Lab"),
                ("user3@test.com", "潮流收藏家_Ken"),
                ("user4@test.com", "Luna_Collect"),
                ("user5@test.com", "Alex_Trade"),
            ]:
                if email in user_ids:
                    print(f"   {email} ({name})")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="BlindBox 豐富假資料種子")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--purge",
        action="store_true",
        help="先刪除市集／社交資料（保留 users 與圖鑑）",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, purge=args.purge)


if __name__ == "__main__":
    main()
