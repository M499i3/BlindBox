"""圖鑑種子：可共用於 seed_catalog.py 與 reset_and_seed_all.py"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from catalog_seed_lib import SeedProduct, build_seed_products, load_showcase


def seed_catalog_on_cursor(cur, products: list[SeedProduct]) -> dict[str, int]:
    """在既有 transaction 的 cursor 上寫入 brands / series / catalog_products。"""
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

    brand_ids: dict[str, str] = {}
    for slug, (_, name) in brands_meta.items():
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
            (slug, name, brand_logos.get(slug)),
        )
        row = cur.fetchone()
        assert row
        brand_ids[slug] = str(row["id"])

    series_ids: dict[tuple[str, str], str] = {}
    for key, (brand_slug, series_slug, series_name) in series_meta.items():
        brand_id = brand_ids[brand_slug]
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
            (brand_id, series_slug, series_name, series_covers.get(key)),
        )
        row = cur.fetchone()
        assert row
        series_ids[key] = str(row["id"])

    for p in products:
        sid = series_ids[(p.brand_slug, p.series_slug)]
        cur.execute(
            """
            INSERT INTO catalog_products (
                external_id, series_id, title,
                official_price_amount, official_price_currency,
                image_url, source_url, is_secret
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
                p.external_id,
                sid,
                p.title,
                p.price_amount,
                p.price_currency,
                p.image_url,
                p.source_url,
                p.is_secret,
            ),
        )

    cur.execute(
        """
        UPDATE series s
        SET total_count = sub.cnt, updated_at = now()
        FROM (
            SELECT series_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE series_id IS NOT NULL
            GROUP BY series_id
        ) sub
        WHERE s.id = sub.series_id
        """
    )
    series_updated = cur.rowcount

    return {
        "brands": len(brands_meta),
        "series": len(series_meta),
        "products": len(products),
        "series_counts_updated": series_updated,
    }


def load_catalog_products(json_path: Path) -> list[SeedProduct]:
    showcase = load_showcase(json_path)
    products = build_seed_products(showcase)
    if not products:
        raise ValueError(f"找不到商品資料：{json_path}")
    return products
