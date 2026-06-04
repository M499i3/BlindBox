"""圖鑑種子：可共用於 seed_catalog.py 與 reset_and_seed_all.py"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from catalog_seed_lib import SeedProduct, build_seed_products, load_showcase


def _upsert_brand(cur, slug: str, name: str, logo: str | None) -> str:
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
        (slug, name, logo),
    )
    return str(cur.fetchone()["id"])


def _upsert_ip(cur, brand_id: str, slug: str, name: str, cover: str | None) -> str:
    cur.execute(
        """
        INSERT INTO ips (brand_id, slug, name, cover_url)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (brand_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            cover_url = COALESCE(EXCLUDED.cover_url, ips.cover_url),
            updated_at = now()
        RETURNING id
        """,
        (brand_id, slug, name, cover),
    )
    return str(cur.fetchone()["id"])


def _upsert_product_series(
    cur, brand_id: str, ip_id: str, slug: str, name: str, cover: str | None
) -> str:
    cur.execute(
        """
        INSERT INTO series (brand_id, ip_id, slug, name, cover_url, total_count)
        VALUES (%s, %s, %s, %s, %s, 0)
        ON CONFLICT (brand_id, ip_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            cover_url = COALESCE(EXCLUDED.cover_url, series.cover_url),
            updated_at = now()
        RETURNING id
        """,
        (brand_id, ip_id, slug, name, cover),
    )
    return str(cur.fetchone()["id"])


def seed_catalog_on_cursor(cur, products: list[SeedProduct]) -> dict[str, int]:
    brand_logos: dict[str, str | None] = {}
    ip_covers: dict[tuple[str, str], str | None] = {}
    line_covers: dict[tuple[str, str, str], str | None] = {}
    for p in products:
        if p.brand_slug not in brand_logos and p.image_url:
            brand_logos[p.brand_slug] = p.image_url
        ik = (p.brand_slug, p.ip_slug)
        if ik not in ip_covers and p.image_url:
            ip_covers[ik] = p.image_url
        lk = (p.brand_slug, p.ip_slug, p.line_slug)
        if lk not in line_covers and p.image_url:
            line_covers[lk] = p.image_url

    brand_ids: dict[str, str] = {}
    ip_ids: dict[tuple[str, str], str] = {}
    series_ids: dict[tuple[str, str, str], str] = {}

    brands_meta = {(p.brand_slug, p.brand_name) for p in products}
    for slug, name in brands_meta:
        brand_ids[slug] = _upsert_brand(cur, slug, name, brand_logos.get(slug))

    for p in products:
        brand_id = brand_ids[p.brand_slug]
        ip_key = (p.brand_slug, p.ip_slug)
        if ip_key not in ip_ids:
            ip_ids[ip_key] = _upsert_ip(
                cur, brand_id, p.ip_slug, p.ip_name, ip_covers.get(ip_key)
            )
        line_key = (p.brand_slug, p.ip_slug, p.line_slug)
        if line_key not in series_ids:
            series_ids[line_key] = _upsert_product_series(
                cur,
                brand_id,
                ip_ids[ip_key],
                p.line_slug,
                p.line_name,
                line_covers.get(line_key),
            )

    for p in products:
        line_key = (p.brand_slug, p.ip_slug, p.line_slug)
        ip_key = (p.brand_slug, p.ip_slug)
        cur.execute(
            """
            INSERT INTO catalog_products (
                external_id, ip_id, series_id, title,
                official_price_amount, official_price_currency,
                image_url, source_url, is_secret
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (external_id) DO UPDATE SET
                ip_id = EXCLUDED.ip_id,
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
                ip_ids[ip_key],
                series_ids[line_key],
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

    cur.execute(
        """
        UPDATE ips i
        SET total_count = sub.cnt, updated_at = now()
        FROM (
            SELECT ip_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE ip_id IS NOT NULL
            GROUP BY ip_id
        ) sub
        WHERE i.id = sub.ip_id
        """
    )
    ips_updated = cur.rowcount

    ip_slugs = {p.ip_slug for p in products}
    line_slugs = {p.line_slug for p in products}
    return {
        "brands": len(brands_meta),
        "ips": len(ip_slugs),
        "series": len(line_slugs),
        "products": len(products),
        "series_counts_updated": series_updated,
        "ip_counts_updated": ips_updated,
    }


def load_catalog_products(json_path: Path) -> list[SeedProduct]:
    showcase = load_showcase(json_path)
    products = build_seed_products(showcase)
    if not products:
        raise ValueError(f"找不到商品資料：{json_path}")
    return products
