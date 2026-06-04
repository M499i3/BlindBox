#!/usr/bin/env python3
"""
清空資料庫並重新植入全部種子資料。

1. TRUNCATE 所有業務表（保留 schema / migration 狀態）
2. 從 koca-popmart-showcase.json 匯入 KOCA 盲盒（gatcha_goods）圖鑑
3. 寫入 5 位測試使用者與市集／交易／社交資料（每張表皆有列）

用法（專案根目錄）：
  npm run db:reset:seed
  python3 backend/scripts/reset_and_seed_all.py
  python3 backend/scripts/reset_and_seed_all.py --dry-run
  python3 backend/scripts/reset_and_seed_all.py --no-reset   # 只追加種子、不清空（不建議）
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
DEFAULT_JSON = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"

sys.path.insert(0, str(SCRIPTS_DIR))

from catalog_seed_lib import build_seed_products, load_showcase  # noqa: E402
from catalog_seed_ops import load_catalog_products, seed_catalog_on_cursor  # noqa: E402
from seed_app_data import run_app_seed  # noqa: E402

# 子表先清，降低鎖等待；每表獨立 TRUNCATE + autocommit 避免卡在大交易裡
TRUNCATE_TABLES = [
    "message_reads",
    "messages",
    "swap_proposals",
    "chat_participants",
    "chats",
    "notifications",
    "user_ratings",
    "user_collections",
    "cart_items",
    "orders",
    "group_buy_members",
    "group_buys",
    "split_box_slots",
    "split_box_groups",
    "listing_images",
    "listings",
    "catalog_products",
    "series",
    "brands",
    "users",
]


def _terminate_idle_transactions(cur) -> int:
    """結束其他 idle in transaction 連線（多為未 commit 的 Supavisor / 後端查詢）。"""
    cur.execute(
        """
        SELECT pg_terminate_backend(a.pid) AS terminated
        FROM pg_stat_activity a
        WHERE a.datname = current_database()
          AND a.pid IS DISTINCT FROM pg_backend_pid()
          AND a.state = 'idle in transaction'
        """
    )
    rows = cur.fetchall()
    n = sum(1 for r in rows if r[0])
    if n:
        print(f"   · 已結束 {n} 個 idle in transaction 連線", flush=True)
    return n


def _warn_pooler_port(url: str) -> None:
    if ":6543" in url or "pooler" in url:
        print(
            "   ⚠️  目前使用 Transaction pooler（常見 port 6543）。"
            "清空大表易卡住，建議 .env 改用 Session URI（port 5432）。",
            flush=True,
        )


def _print_lock_blockers(cur, table: str) -> None:
    cur.execute(
        """
        SELECT DISTINCT
            blocking.pid,
            blocking.usename,
            blocking.application_name,
            blocking.state,
            LEFT(blocking.query, 100) AS query
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_locks blocking_locks
          ON blocking_locks.locktype = blocked_locks.locktype
         AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
         AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
         AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
         AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
         AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
         AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
         AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
         AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
         AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
         AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking
          ON blocking.pid = blocking_locks.pid
        JOIN pg_catalog.pg_class cls ON cls.oid = blocked_locks.relation
        WHERE NOT blocked_locks.granted
          AND cls.relname = %s
          AND blocking.pid IS DISTINCT FROM pg_backend_pid()
        LIMIT 5
        """,
        (table,),
    )
    rows = cur.fetchall()
    if not rows:
        return
    print(f"   ⚠️  等待 {table} 鎖時，可能被以下連線佔用：", flush=True)
    for pid, user, app, state, query in rows:
        print(f"      pid={pid} user={user} app={app!r} state={state}", flush=True)
        if query:
            print(f"        query: {query}", flush=True)


def _delete_catalog_products(cur, batch_size: int = 500) -> None:
    """不先做 COUNT（大表在鎖表時 COUNT 也會卡住），用 ctid 分批刪除。"""
    total_deleted = 0
    rounds = 0
    max_rounds = 10_000
    while rounds < max_rounds:
        rounds += 1
        cur.execute(
            """
            DELETE FROM catalog_products
            WHERE ctid IN (
                SELECT ctid FROM catalog_products LIMIT %s
            )
            """,
            (batch_size,),
        )
        n = cur.rowcount
        if n <= 0:
            break
        total_deleted += n
        if rounds == 1 or rounds % 5 == 0:
            print(f"      已刪除 {total_deleted} 筆…", flush=True)
    if rounds >= max_rounds:
        raise RuntimeError("catalog_products 刪除輪次過多，請檢查是否有連線鎖表")


def _clear_one_table(cur, table: str) -> None:
    from psycopg2 import sql

    # 等鎖最多 90 秒，避免無限卡住
    cur.execute("SET lock_timeout = '90s'")
    cur.execute("SET statement_timeout = '120s'")

    try:
        if table == "catalog_products":
            print("      （分批 DELETE，稍後會從 showcase.json 重新匯入）", flush=True)
            _delete_catalog_products(cur)
            return

        cur.execute(
            sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(
                sql.Identifier(table)
            )
        )
    except KeyboardInterrupt:
        raise SystemExit(
            f"\n已中斷（停在 {table}）。若長時間無進度，代表資料庫連線被鎖住。\n"
            "請關閉 backend:dev、Supabase SQL Editor，改用 Session URI（port 5432）後再試。"
        ) from None
    except Exception as e:
        _print_lock_blockers(cur, table)
        raise SystemExit(
            f"\n清空 {table} 失敗：{e}\n"
            "請關閉 npm run backend:dev 與 Supabase SQL Editor，"
            "確認 .env 使用 Session 連線（port 5432）後再執行 npm run db:reset:seed。"
        ) from e


def reset_all_tables(url: str) -> None:
    import psycopg2

    _warn_pooler_port(url)
    conn = psycopg2.connect(url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            print("   · 釋放 Supavisor 殘留交易（idle in transaction）…", flush=True)
            _terminate_idle_transactions(cur)
            for table in TRUNCATE_TABLES:
                print(f"   · {table}", flush=True)
                _clear_one_table(cur, table)
    finally:
        conn.close()


def _pg_url() -> str:
    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def _count_rows(cur, table: str) -> int:
    cur.execute(f"SELECT COUNT(*) AS n FROM {table}")  # noqa: S608 — 固定表名
    row = cur.fetchone()
    return int(row["n"]) if row else 0


ALL_TABLES = [
    "brands",
    "series",
    "catalog_products",
    "users",
    "user_ratings",
    "user_collections",
    "listings",
    "listing_images",
    "cart_items",
    "orders",
    "swap_proposals",
    "group_buys",
    "group_buy_members",
    "split_box_groups",
    "split_box_slots",
    "chats",
    "chat_participants",
    "messages",
    "message_reads",
    "notifications",
]


def run(*, json_path: Path, dry_run: bool, do_reset: bool) -> None:
    products = load_catalog_products(json_path)
    showcase = load_showcase(json_path)
    raw_count = len(showcase.get("products", []))

    print("=" * 60)
    print("BlindBox 全庫重置與種子")
    print("=" * 60)
    print(f"圖鑑來源：{json_path}")
    print(f"  JSON 商品數：{raw_count}")
    print(f"  解析後匯入：{len(products)} 筆（含品牌/系列衍生）")

    if dry_run:
        print("\n[dry-run] 將執行：")
        if do_reset:
            print("  - TRUNCATE 20 張業務表")
        print(f"  - 圖鑑：~{len(products)} products")
        print("  - 應用：5 users, 20 listings, 4 拆盒團, ~16 slots, …")
        return

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit(
            "缺少 psycopg2。請執行：npm run backend:install"
        ) from e

    url = _pg_url()
    if do_reset:
        print("\n🗑️  清空既有資料（請先關閉 backend:dev，避免鎖表）…")
        reset_all_tables(url)

    conn = psycopg2.connect(url)
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SET LOCAL statement_timeout = '300s'")

                print("\n📦 匯入圖鑑（brands → series → catalog_products）…")
                cat_stats = seed_catalog_on_cursor(cur, products)
                print(
                    f"   brands={cat_stats['brands']}, "
                    f"series={cat_stats['series']}, "
                    f"products={cat_stats['products']}"
                )

                print("\n👤 匯入使用者與市集／社交資料…")
                app_stats = run_app_seed(cur)
                for k, v in app_stats.items():
                    print(f"   {k}: {v}")

                print("\n📊 各表筆數：")
                for table in ALL_TABLES:
                    n = _count_rows(cur, table)
                    mark = "✓" if n > 0 else "✗ 空"
                    print(f"   {mark} {table}: {n}")

                empty = [t for t in ALL_TABLES if _count_rows(cur, t) == 0]
                if empty:
                    raise SystemExit(f"下列表仍為空：{', '.join(empty)}")

        print("\n✅ 全庫種子完成")
        print("\n測試帳號（密碼皆 password）：")
        for email, name in [
            ("user1@test.com", "Yu"),
            ("user2@test.com", "Mina_Lab"),
            ("user3@test.com", "潮流收藏家_Ken"),
            ("user4@test.com", "Luna_Collect"),
            ("user5@test.com", "Alex_Trade"),
        ]:
            print(f"   {email}  ({name})")
        print("\n登入：http://localhost:3001/login")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="重置 DB 並植入全部種子")
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="不清空表，僅追加種子（可能違反 UNIQUE，一般不建議）",
    )
    args = parser.parse_args()
    if not args.json.is_file():
        raise SystemExit(f"找不到 JSON：{args.json}")
    run(json_path=args.json, dry_run=args.dry_run, do_reset=not args.no_reset)


if __name__ == "__main__":
    main()
