"""
修正 listings.price_amount 因 seed 腳本錯誤除以 100 造成的錯誤值。

問題：seed_app_data.py / seed_dev_demo.py 誤將面值（例如 NT$520）視為「分」，
      再除以 100 存入 DB，導致 price_amount = 5（應為 520）。

修正策略（依優先順序）：
  1. 若該 listing 連結至 catalog_products 且有 official_price_amount，
     直接使用 official_price_amount（原始面值，最準確）。
  2. 其餘 price_amount 落在 1–99 的 listing，乘以 100 近似還原。
     （swap listing 的 price_amount = 0 不動）

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

    # ── 1. Preview current state ──────────────────────────────────────────────
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

    if stats["broken_count"] == 0:
        print("沒有需要修正的 listing，結束。")
        return

    # ── 2. Strategy A: restore from catalog official_price_amount ────────────
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

    # ── 3. Strategy B: multiply ×100 for the rest ─────────────────────────────
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

    if not args.apply:
        print("\n[dry-run] 加上 --apply 才會實際修改。")
        conn.close()
        return

    # ── 4. Apply ──────────────────────────────────────────────────────────────
    updated_a = 0
    if strategy_a:
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

    updated_b = 0
    if strategy_b:
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
    print(f"\n✅ 完成：策略A 修正 {updated_a} 筆，策略B 修正 {updated_b} 筆")
    conn.close()


if __name__ == "__main__":
    main()
