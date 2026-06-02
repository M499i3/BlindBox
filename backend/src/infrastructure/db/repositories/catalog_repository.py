from __future__ import annotations

import psycopg2.extensions

from domain.entities import CatalogProduct


_PRODUCT_SELECT = """
    SELECT
        cp.id,
        cp.external_id,
        cp.title,
        cp.official_price_amount,
        cp.official_price_currency,
        cp.image_url,
        cp.source_url
    FROM catalog_products cp
    ORDER BY cp.updated_at DESC
"""

_PRODUCT_BY_EXTERNAL_ID = """
    SELECT
        cp.id,
        cp.external_id,
        cp.title,
        cp.official_price_amount,
        cp.official_price_currency,
        cp.image_url,
        cp.source_url
    FROM catalog_products cp
    WHERE cp.external_id = %s OR cp.id::text = %s
    LIMIT 1
"""

_BRANDS_SELECT = """
    SELECT id, slug, name
    FROM brands
    ORDER BY name ASC
"""

_SERIES_BY_BRAND = """
    SELECT s.id, s.slug, s.name
    FROM series s
    JOIN brands b ON b.id = s.brand_id
    WHERE b.slug = %s
    ORDER BY s.name ASC
"""

_STYLES_BY_BRAND_SERIES = """
    SELECT cp.id, cp.title, cp.image_url
    FROM catalog_products cp
    JOIN series s ON s.id = cp.series_id
    JOIN brands b ON b.id = s.brand_id
    WHERE b.slug = %s AND s.slug = %s
    ORDER BY cp.title ASC
"""


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "HK$ 0.00"
    major = amount / 100
    symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency or "HKD", "HK$")
    if currency == "HKD":
        return f"{symbol} {major:.2f}"
    return f"{symbol} {int(major) if major == int(major) else major}"


def _row_to_product(row: dict) -> CatalogProduct:
    product_id = row["external_id"] or str(row["id"])
    return CatalogProduct(
        id=product_id,
        title=row["title"],
        price=_format_price(row["official_price_amount"], row["official_price_currency"]),
        image=row["image_url"] or "",
        source_url=row["source_url"] or "",
    )


def get_all_products(conn: psycopg2.extensions.connection) -> list[CatalogProduct]:
    with conn.cursor() as cur:
        cur.execute(_PRODUCT_SELECT)
        rows = cur.fetchall()
    return [_row_to_product(dict(r)) for r in rows]


def get_product_by_id(
    conn: psycopg2.extensions.connection, product_id: str
) -> CatalogProduct | None:
    with conn.cursor() as cur:
        cur.execute(_PRODUCT_BY_EXTERNAL_ID, (product_id, product_id))
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_product(dict(row))


def get_all_brands(conn: psycopg2.extensions.connection) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_BRANDS_SELECT)
        rows = cur.fetchall()
    return [
        {"id": str(r["id"]), "slug": r["slug"], "name": r["name"]}
        for r in rows
    ]


def get_series_by_brand_slug(
    conn: psycopg2.extensions.connection, brand_slug: str
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_SERIES_BY_BRAND, (brand_slug,))
        rows = cur.fetchall()
    return [
        {"id": str(r["id"]), "slug": r["slug"], "name": r["name"]}
        for r in rows
    ]


def get_styles_by_brand_series_slug(
    conn: psycopg2.extensions.connection, brand_slug: str, series_slug: str
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_STYLES_BY_BRAND_SERIES, (brand_slug, series_slug))
        rows = cur.fetchall()
    return [
        {"id": str(r["id"]), "name": r["title"], "image": r.get("image_url") or ""}
        for r in rows
    ]
