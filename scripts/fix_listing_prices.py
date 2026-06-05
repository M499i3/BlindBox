"""
修正 listings.price_amount 與 orders.amount 因 seed 腳本錯誤除以 100 造成的錯誤值。

問題：seed_app_data.py / seed_dev_demo.py 誤將面值（例如 NT$520）視為「分」，
      再除以 100 存入 DB，導致 price_amount = 5（應為 520）。
      訂單在 listing 修正之前建立，orders.amount 也殘留錯誤值。

修正策略（依優先順序）：
  1. 若該 listing 連結至 catalog_products 且有 official_price_amount，
     直接使用 official_price_amount（原始面值，最準確）。
  2. 其餘 price_amount 落在 1–99 的 listing，乘以 100 近似還原。
     （swap listing 的 price_amount = 0 不動）
  3. orders.amount 落在 1–99 的訂單，從對應 listing 的 price_amount 同步。

用法：
    python scripts/fix_listing_prices.py           # 預覽
    python scripts/fix_listing_prices.py --apply   # 實際修正
"""
from __future__ import annotations

import argparse
import os
import re

import psycopg2
import psycopg2.extras


def load_dsn() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        return dsn
    for path in [".env", "../.env"]:
        try:
            txt = open(path, encoding="utf-8").read()
            m = re.search(r"^DATABASE_URL=(.+)$", txt, re.M)
            if m:
                return m.group(1).strip()
        except FileNotFoundError:
            continue
    raise RuntimeError("DATABASE_URL not found")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Actually write to DB")
    args = ap.parse_args()

    conn = psycopg2.connect(load_dsn())
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── 1. Preview listings ───────────────────────────────────────────────────
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE l.price_amount BETWEEN 1 AND 99)  AS broken_count,
            COUNT(*) FILTER (WHERE l.price_amount = 0)               AS zero_count,
            COUNT(*) FILTER (WHERE l.price_amount >= 100)            AS ok_count,
            COUNT(*)                                                  AS total
        FROM listings l
        WHERE l.deleted_at IS NULL
    """)
    stats = cur.fetchone()
    print(f"listings 現況：total={stats['total']}  "
          f"broken(1-99)={stats['broken_count']}  "
          f"zero={stats['zero_count']}  ok(≥100)={stats['ok_count']}")

    listing_broken = stats["broken_count"] > 0

    if listing_broken:
        # ── 2. Strategy A ─────────────────────────────────────────────────────
        cur.execute("""
            SELECT
                l.id        AS listing_id,
                l.price_amount  AS current_price,
                cp.official_price_amount AS official_price,
                cp.title    AS product_title
            FROM listings l
            JOIN catalog_products cp ON cp.id = l.catalog_product_id
            WHERE l.price_amount BETWEEN 1 AND 99
              AND l.deleted_at IS NULL
              AND cp.official_price_amount IS NOT NULL
              AND cp.official_price_amount > 0
            ORDER BY l.price_amount
        """)
        strategy_a = cur.fetchall()
        print(f"\n策略 A（官方定價還原）：{len(strategy_a)} 筆")
        for r in strategy_a[:5]:
            print(f"  {r['product_title'][:40]}  {r['current_price']} → {r['official_price']}")
        if len(strategy_a) > 5:
            print(f"  … 共 {len(strategy_a)} 筆")

        # ── 3. Strategy B ─────────────────────────────────────────────────────
        cur.execute("""
            SELECT
                l.id           AS listing_id,
                l.price_amount AS current_price,
                l.price_amount * 100 AS restored_price,
                l.title
            FROM listings l
            WHERE l.price_amount BETWEEN 1 AND 99
              AND l.deleted_at IS NULL
              AND (
                  l.catalog_product_id IS NULL
                  OR NOT EXISTS (
                      SELECT 1 FROM catalog_products cp
                      WHERE cp.id = l.catalog_product_id
                        AND cp.official_price_amount IS NOT NULL
                        AND cp.official_price_amount > 0
                  )
              )
            ORDER BY l.price_amount
        """)
        strategy_b = cur.fetchall()
        print(f"\n策略 B（×100 近似還原）：{len(strategy_b)} 筆")
        for r in strategy_b[:5]:
            print(f"  {r['title'][:40]}  {r['current_price']} → {r['restored_price']}")
        if len(strategy_b) > 5:
            print(f"  … 共 {len(strategy_b)} 筆")
    else:
        print("listings 無需修正。")

    # ── 4. Preview orders ─────────────────────────────────────────────────────
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE o.amount BETWEEN 1 AND 99) AS broken_count,
            COUNT(*) FILTER (WHERE o.amount >= 100)           AS ok_count,
            COUNT(*)                                          AS total
        FROM orders o
        WHERE o.deleted_at IS NULL
    """)
    ostats = cur.fetchone()
    print(f"\norders 現況：total={ostats['total']}  "
          f"broken(1-99)={ostats['broken_count']}  ok(≥100)={ostats['ok_count']}")

    order_broken = ostats["broken_count"] > 0
    if order_broken:
        cur.execute("""
            SELECT o.id, o.amount AS current, l.price_amount AS correct,
                   l.title
            FROM orders o
            JOIN listings l ON l.id = o.listing_id
            WHERE o.amount BETWEEN 1 AND 99
              AND o.deleted_at IS NULL
            ORDER BY o.amount
        """)
        broken_rows = cur.fetchall()
        print(f"orders 需修正：{len(broken_rows)} 筆（從 listing.price_amount 同步）")
        for r in broken_rows[:5]:
            print(f"  {r['title'][:40]}  {r['current']} → {r['correct']}")
        if len(broken_rows) > 5:
            print(f"  … 共 {len(broken_rows)} 筆")
    else:
        print("orders 無需修正。")

    if not args.apply:
        print("\n[dry-run] 加上 --apply 才會實際修改。")
        conn.close()
        return

    # ── 5. Apply listings ─────────────────────────────────────────────────────
    if listing_broken:
        updated_a = 0
        cur.execute("""
            UPDATE listings l
            SET price_amount = cp.official_price_amount,
                updated_at   = now()
            FROM catalog_products cp
            WHERE cp.id = l.catalog_product_id
              AND l.price_amount BETWEEN 1 AND 99
              AND l.deleted_at IS NULL
              AND cp.official_price_amount IS NOT NULL
              AND cp.official_price_amount > 0
        """)
        updated_a = cur.rowcount

        cur.execute("""
            UPDATE listings l
            SET price_amount = l.price_amount * 100,
                updated_at   = now()
            WHERE l.price_amount BETWEEN 1 AND 99
              AND l.deleted_at IS NULL
              AND (
                  l.catalog_product_id IS NULL
                  OR NOT EXISTS (
                      SELECT 1 FROM catalog_products cp
                      WHERE cp.id = l.catalog_product_id
                        AND cp.official_price_amount IS NOT NULL
                        AND cp.official_price_amount > 0
                  )
              )
        """)
        updated_b = cur.rowcount
        conn.commit()
        print(f"\n✅ listings：策略A 修正 {updated_a} 筆，策略B 修正 {updated_b} 筆")

    # ── 6. Apply orders ───────────────────────────────────────────────────────
    if order_broken:
        cur.execute("""
            UPDATE orders o
            SET amount     = l.price_amount,
                currency   = l.price_currency,
                updated_at = now()
            FROM listings l
            WHERE o.listing_id = l.id
              AND o.amount BETWEEN 1 AND 99
              AND o.deleted_at IS NULL
        """)
        updated_orders = cur.rowcount
        conn.commit()
        print(f"✅ orders：修正 {updated_orders} 筆")

    conn.close()


if __name__ == "__main__":
    main()
