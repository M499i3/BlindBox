#!/usr/bin/env python3
"""
將 frontend/data/popmart-hk-showcase.json 匯入 PostgreSQL（brands → series → catalog_products）。

需已執行 alembic upgrade head。支援冪等 upsert（external_id / slug）。

用法（專案根目錄）：
  python3 backend/scripts/seed_catalog.py
  python3 backend/scripts/seed_catalog.py --dry-run
  python3 backend/scripts/seed_catalog.py --no-dev-user
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

# backend/src → infrastructure.db.config
BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(SCRIPTS_DIR))

from catalog_seed_lib import (  # noqa: E402
    SeedProduct,
    build_seed_products,
    load_showcase,
)

DEFAULT_JSON = REPO_ROOT / "frontend" / "data" / "popmart-hk-showcase.json"
DEV_USER_EMAIL = "dev@blindbox.local"
DEV_USER_NAME = "Yu"


def _pg_url() -> str:
    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def upsert_brand(cur, slug: str, name: str, logo_url: str | None) -> str:
    cur.execute(
        """
        INSERT INTO brands (slug, name, logo_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
            updated_at = now()
        RETURNING id
        """,
        (slug, name, logo_url),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def upsert_series(
    cur, brand_id: str, slug: str, name: str, cover_url: str | None
) -> str:
    cur.execute(
        """
        INSERT INTO series (brand_id, slug, name, cover_url, total_count)
        VALUES (%s, %s, %s, %s, 0)
        ON CONFLICT (brand_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            cover_url = COALESCE(EXCLUDED.cover_url, series.cover_url),
            updated_at = now()
        RETURNING id
        """,
        (brand_id, slug, name, cover_url),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def upsert_catalog_product(cur, product: SeedProduct, series_id: str) -> None:
    cur.execute(
        """
        INSERT INTO catalog_products (
            external_id,
            series_id,
            title,
            official_price_amount,
            official_price_currency,
            image_url,
            source_url,
            is_secret
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (external_id) DO UPDATE SET
            series_id = EXCLUDED.series_id,
            title = EXCLUDED.title,
            official_price_amount = EXCLUDED.official_price_amount,
            official_price_currency = EXCLUDED.official_price_currency,
            image_url = EXCLUDED.image_url,
            source_url = EXCLUDED.source_url,
            is_secret = EXCLUDED.is_secret,
            updated_at = now()
        """,
        (
            product.external_id,
            series_id,
            product.title,
            product.price_amount,
            product.price_currency,
            product.image_url,
            product.source_url,
            product.is_secret,
        ),
    )


def refresh_series_counts(cur) -> int:
    cur.execute(
        """
        UPDATE series s
        SET total_count = sub.cnt,
            updated_at = now()
        FROM (
            SELECT series_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE series_id IS NOT NULL
            GROUP BY series_id
        ) sub
        WHERE s.id = sub.series_id
        """
    )
    return cur.rowcount


def seed_dev_user(cur) -> str:
    cur.execute(
        """
        INSERT INTO users (display_name, email)
        VALUES (%s, %s)
        ON CONFLICT (email) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            updated_at = now()
        RETURNING id
        """,
        (DEV_USER_NAME, DEV_USER_EMAIL),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def run_seed(
    json_path: Path,
    *,
    dry_run: bool,
    seed_user: bool,
) -> None:
    showcase = load_showcase(json_path)
    products = build_seed_products(showcase)
    if not products:
        raise SystemExit(f"找不到商品資料：{json_path}")

    brand_logos: dict[str, str | None] = {}
    series_covers: dict[tuple[str, str], str | None] = {}
    for p in products:
        if p.brand_slug not in brand_logos and p.image_url:
            brand_logos[p.brand_slug] = p.image_url
        key = (p.brand_slug, p.series_slug)
        if key not in series_covers and p.image_url:
            series_covers[key] = p.image_url

    brands_meta: dict[str, tuple[str, str]] = {}
    series_meta: dict[tuple[str, str], tuple[str, str, str]] = {}
    for p in products:
        brands_meta[p.brand_slug] = (p.brand_slug, p.brand_name)
        series_meta[(p.brand_slug, p.series_slug)] = (
            p.brand_slug,
            p.series_slug,
            p.series_name,
        )

    print(f"來源：{json_path}")
    print(
        f"將匯入 {len(products)} 筆商品、"
        f"{len(brands_meta)} 個品牌、{len(series_meta)} 個系列"
    )

    if dry_run:
        print("[dry-run] 略過資料庫寫入")
        return

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit(
            "缺少 psycopg2。請執行：cd backend && python3 -m venv .venv && "
            "source .venv/bin/activate && pip install -r requirements.txt"
        ) from e

    conn = psycopg2.connect(_pg_url())
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                brand_ids: dict[str, str] = {}
                for slug, (_, name) in brands_meta.items():
                    brand_ids[slug] = upsert_brand(
                        cur, slug, name, brand_logos.get(slug)
                    )

                series_ids: dict[tuple[str, str], str] = {}
                for key, (brand_slug, series_slug, series_name) in series_meta.items():
                    brand_id = brand_ids[brand_slug]
                    series_ids[key] = upsert_series(
                        cur,
                        brand_id,
                        series_slug,
                        series_name,
                        series_covers.get(key),
                    )

                for p in products:
                    sid = series_ids[(p.brand_slug, p.series_slug)]
                    upsert_catalog_product(cur, p, sid)

                updated_series = refresh_series_counts(cur)

                dev_id: str | None = None
                if seed_user:
                    dev_id = seed_dev_user(cur)

        print(f"✅ 完成：{len(products)} 筆 catalog_products")
        print(f"   已更新 {updated_series} 個系列的 total_count")
        if dev_id:
            print(f"   開發用使用者：{DEV_USER_NAME} ({dev_id})")
            print(f"   可加入 .env：VITE_DEV_USER_ID={dev_id}")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="BlindBox 圖鑑種子資料")
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON,
        help=f"showcase JSON 路徑（預設 {DEFAULT_JSON.relative_to(REPO_ROOT)}）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只解析統計，不寫入資料庫",
    )
    parser.add_argument(
        "--no-dev-user",
        action="store_true",
        help="不建立開發用使用者 (Yu)",
    )
    args = parser.parse_args()

    if not args.json.is_file():
        raise SystemExit(f"找不到 JSON：{args.json}")

    run_seed(
        args.json,
        dry_run=args.dry_run,
        seed_user=not args.no_dev_user,
    )


if __name__ == "__main__":
    main()
