"""
KOCA secondary-market transaction price scraper.

For every catalog_products row that has an external_id (= KOCA item ID),
fetch the complete order-history from koca.shop and write confirmed
transactions into price_history (source='koca', currency='TWD').

Usage:
    python scripts/koca_price_scraper.py          # live run
    python scripts/koca_price_scraper.py --dry-run # preview without DB writes
    python scripts/koca_price_scraper.py --limit 50 # only process first 50 items
    python scripts/koca_price_scraper.py --item 397584 # single item debug

Environment variables (read from .env in repo root if not set):
    DATABASE_URL   — PostgreSQL connection string (required)

API reference (no auth required):
    GET https://koca.shop/api/items/{id}/order-history/count
        → { "total": N }
    GET https://koca.shop/api/items/{id}/order-history?limit=20&cursor={c}
        → { "next": cursor, "records": [...] }

price_history mapping:
    price_amount   = record.subtotal            (NT$ integer, item price excl. fees)
    shipping_fee   = record.shippingFee         (NT$ integer)
    packaging_fee  = record.packagingFee        (NT$ integer)
    total_amount   = record.total               (NT$ integer, buyer's full outlay)
    listed_price   = record.option.price        (seller's ask at time of sale)
    price_currency = 'TWD'
    source         = 'koca'
    source_item_id = "{external_id}_{createdAt}"   (dedup key)
    order_status   = record.status              (raw KOCA status, preserved for auditing)
    option_name    = record.option.name         (variant name sold)
    variant_alias  = record.option.items[0].alias  (exact item alias)
    traded_at      = record.createdAt
    match_score    = 100.0  (exact external_id match, no fuzzy logic)
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
import requests

BACKEND_SRC = Path(__file__).resolve().parents[1] / "backend" / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "https://koca.shop"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Referer": "https://koca.shop/zh-TW/",
}

# Statuses that represent a real completed transaction on KOCA
COMPLETED_STATUSES = {
    "settled",
    "delivered",
    "shipping_number_provided",
    "shipped",
}

PAGE_SIZE = 20
REQUEST_DELAY = 0.15   # seconds between API calls


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def load_database_url() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        return dsn
    # Fallback: parse .env in repo root (two levels up from scripts/)
    for candidate in [".env", "../.env", os.path.join(os.path.dirname(__file__), "..", ".env")]:
        try:
            txt = open(candidate, encoding="utf-8").read()
            m = re.search(r"^DATABASE_URL=(.+)$", txt, flags=re.M)
            if m:
                return m.group(1).strip()
        except FileNotFoundError:
            continue
    raise RuntimeError(
        "DATABASE_URL not set and not found in .env. "
        "Copy .env.example → .env and fill in DATABASE_URL."
    )


def fetch_catalog_items(cur: Any) -> list[dict]:
    """Return all catalog_products rows that have a KOCA external_id."""
    cur.execute(
        """
        SELECT id::text AS catalog_product_id,
               external_id,
               title
        FROM   catalog_products
        WHERE  external_id IS NOT NULL
               AND btrim(external_id) <> ''
        ORDER  BY external_id::bigint
        """
    )
    return cur.fetchall()


def fetch_existing_source_ids(cur: Any) -> set[str]:
    """Return the set of source_item_ids already in price_history for source='koca'."""
    cur.execute(
        "SELECT source_item_id FROM price_history WHERE source = 'koca'"
    )
    return {row["source_item_id"] for row in cur.fetchall()}


# ---------------------------------------------------------------------------
# KOCA API helpers
# ---------------------------------------------------------------------------

def _get(url: str, retries: int = 3) -> Any:
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404:
                return None
            if resp.status_code >= 500 and attempt < retries:
                time.sleep(REQUEST_DELAY * attempt * 2)
                continue
            resp.raise_for_status()
        except requests.RequestException as exc:
            if attempt == retries:
                raise
            time.sleep(REQUEST_DELAY * attempt * 2)
    return None


def fetch_order_count(item_id: str) -> int:
    """Return total transaction count for a KOCA item (0 if none or 404)."""
    url = f"{BASE_URL}/api/items/{item_id}/order-history/count"
    data = _get(url)
    if data is None:
        return 0
    return int(data.get("total", 0))


def fetch_order_history(item_id: str) -> list[dict]:
    """
    Page through /api/items/{id}/order-history and return all records.
    Each record looks like:
      {
        "createdAt": "2026-06-03T14:41:30.955669Z",
        "status": "shipped",
        "subtotal": "1350",
        "shippingFee": "38",
        "total": "1388",
        "packagingFee": "0",
        "option": {
          "price": "1350",
          "name": "Winter雪人娃+泡泡馬特手機掛繩冬",
          "items": [{"alias": "Winter普通款", ...}]
        }
      }
    """
    records: list[dict] = []
    cursor = None

    for page in range(500):  # hard cap at 500 pages × 20 = 10,000 records
        qs = f"limit={PAGE_SIZE}"
        if cursor is not None:
            qs += f"&cursor={cursor}"
        url = f"{BASE_URL}/api/items/{item_id}/order-history?{qs}"
        data = _get(url)

        if data is None:
            break

        batch = data.get("records") or []
        records.extend(batch)

        next_cursor = data.get("next")
        if not batch or next_cursor is None or next_cursor == cursor:
            break
        cursor = next_cursor
        time.sleep(REQUEST_DELAY)

    return records


# ---------------------------------------------------------------------------
# Transform
# ---------------------------------------------------------------------------

def _parse_int(val: Any) -> int | None:
    """Parse a NT$ integer from a string or number; return None if unparseable."""
    if val is None:
        return None
    try:
        return int(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def build_price_row(
    catalog_product_id: str,
    external_id: str,
    record: dict,
) -> dict | None:
    """
    Convert a raw KOCA order-history record into a price_history row dict.
    Returns None if the record should be skipped (bad status, missing price, etc.)
    """
    status = record.get("status", "")
    if status not in COMPLETED_STATUSES:
        return None

    subtotal_raw = record.get("subtotal") or record.get("total") or ""
    price_amount = _parse_int(subtotal_raw)
    if not price_amount or price_amount <= 0:
        return None

    created_at = record.get("createdAt") or record.get("created_at")
    if not created_at:
        return None

    option = record.get("option") or {}
    items = option.get("items") or []
    variant_alias = items[0].get("alias") if items else None

    # source_item_id: stable dedup key unique per transaction
    source_item_id = f"{external_id}_{created_at}"

    return {
        "catalog_product_id": catalog_product_id,
        "price_amount": price_amount,
        "shipping_fee": _parse_int(record.get("shippingFee")),
        "packaging_fee": _parse_int(record.get("packagingFee")),
        "total_amount": _parse_int(record.get("total")),
        "listed_price": _parse_int(option.get("price")),
        "price_currency": "TWD",
        "source": "koca",
        "source_item_id": source_item_id,
        "order_status": status or None,
        "option_name": option.get("name") or None,
        "variant_alias": variant_alias or None,
        "condition": None,      # KOCA doesn't expose condition in order history
        "match_score": 100.0,   # external_id is an exact match, no fuzzy logic
        "traded_at": created_at,
    }


# ---------------------------------------------------------------------------
# Database write
# ---------------------------------------------------------------------------

INSERT_SQL = """
INSERT INTO price_history
    (catalog_product_id,
     price_amount, shipping_fee, packaging_fee, total_amount, listed_price,
     price_currency,
     source, source_item_id,
     order_status, option_name, variant_alias,
     condition, match_score, traded_at)
VALUES
    (%(catalog_product_id)s,
     %(price_amount)s, %(shipping_fee)s, %(packaging_fee)s,
     %(total_amount)s, %(listed_price)s,
     %(price_currency)s,
     %(source)s, %(source_item_id)s,
     %(order_status)s, %(option_name)s, %(variant_alias)s,
     %(condition)s, %(match_score)s, %(traded_at)s)
ON CONFLICT (source, source_item_id) DO NOTHING
"""


def upsert_rows(cur: Any, rows: list[dict]) -> int:
    """Insert rows into price_history; returns number of new rows inserted."""
    if not rows:
        return 0
    cur.executemany(INSERT_SQL, rows)
    return cur.rowcount  # may be negative with executemany; use len(rows) instead


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape KOCA order history into price_history")
    ap.add_argument("--dry-run", action="store_true",
                    help="Fetch data and print preview but do not write to DB")
    ap.add_argument("--limit", type=int, default=0,
                    help="Only process the first N catalog items (0 = all)")
    ap.add_argument("--item", type=str, default="",
                    help="Only process this single KOCA external_id (for debugging)")
    args = ap.parse_args()

    dsn = load_database_url()
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("Loading catalog items from database…")
    catalog_items = fetch_catalog_items(cur)
    print(f"  {len(catalog_items)} items with external_id")

    if args.item:
        catalog_items = [r for r in catalog_items if r["external_id"] == args.item]
        print(f"  Filtered to {len(catalog_items)} items matching --item {args.item}")

    if args.limit and args.limit > 0:
        catalog_items = catalog_items[: args.limit]
        print(f"  Limited to first {len(catalog_items)} items")

    if not args.dry_run:
        print("Loading existing source_item_ids…")
        existing_ids = fetch_existing_source_ids(cur)
        print(f"  {len(existing_ids)} existing koca records (will skip duplicates)")
    else:
        existing_ids = set()

    # --- scrape loop ---
    total_fetched = 0
    total_skipped_status = 0
    total_new = 0
    total_duplicate = 0
    items_with_data = 0

    for idx, item in enumerate(catalog_items, 1):
        ext_id = item["external_id"]
        cat_id = item["catalog_product_id"]
        title = item["title"]

        # Quick count check (saves fetching full history for empty items)
        time.sleep(REQUEST_DELAY)
        count = fetch_order_count(ext_id)
        if count == 0:
            if idx % 50 == 0:
                print(f"  [{idx}/{len(catalog_items)}] {ext_id} — 0 transactions (skip)")
            continue

        print(f"  [{idx}/{len(catalog_items)}] {ext_id}  {title[:40]}  — {count} transaction(s)")

        time.sleep(REQUEST_DELAY)
        records = fetch_order_history(ext_id)
        total_fetched += len(records)
        items_with_data += 1

        rows_to_insert: list[dict] = []
        for rec in records:
            row = build_price_row(cat_id, ext_id, rec)
            if row is None:
                total_skipped_status += 1
                continue
            sid = row["source_item_id"]
            if sid in existing_ids:
                total_duplicate += 1
                continue
            rows_to_insert.append(row)
            existing_ids.add(sid)   # prevent duplicate in this run

        if args.dry_run:
            for row in rows_to_insert[:3]:
                print(f"    DRY-RUN  NT${row['price_amount']}  {row['traded_at']}  {row['option_name']}")
            if len(rows_to_insert) > 3:
                print(f"    … and {len(rows_to_insert) - 3} more")
            total_new += len(rows_to_insert)
        else:
            if rows_to_insert:
                upsert_rows(cur, rows_to_insert)
                conn.commit()
                total_new += len(rows_to_insert)
                print(f"    ✓ inserted {len(rows_to_insert)} new rows")

    # --- summary ---
    print()
    print("=" * 60)
    print(f"Items scanned      : {len(catalog_items)}")
    print(f"Items with history : {items_with_data}")
    print(f"Records fetched    : {total_fetched}")
    print(f"Skipped (status)   : {total_skipped_status}")
    print(f"Skipped (duplicate): {total_duplicate}")
    print(f"New rows {'(DRY-RUN) ' if args.dry_run else ''}inserted: {total_new}")
    print("=" * 60)

    if not args.dry_run and total_new > 0:
        print("\n📊 重算 price stats…")
        from application.catalog_heat_service import compute_price_stats  # noqa: E402
        updated = compute_price_stats(conn)
        print(f"   已更新 {updated} 筆商品的成交統計")

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
