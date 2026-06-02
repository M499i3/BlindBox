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
        cp.source_url,
        b.slug AS brand_slug,
        b.name AS brand_name,
        s.slug AS series_slug,
        s.name AS series_name
    FROM catalog_products cp
    LEFT JOIN series s ON s.id = cp.series_id
    LEFT JOIN brands b ON b.id = s.brand_id
"""

_PRODUCT_BY_EXTERNAL_ID = """
    SELECT
        cp.id,
        cp.external_id,
        cp.title,
        cp.official_price_amount,
        cp.official_price_currency,
        cp.image_url,
        cp.source_url,
        b.slug AS brand_slug,
        b.name AS brand_name,
        s.slug AS series_slug,
        s.name AS series_name
    FROM catalog_products cp
    LEFT JOIN series s ON s.id = cp.series_id
    LEFT JOIN brands b ON b.id = s.brand_id
    WHERE cp.external_id = %s OR cp.id::text = %s
    LIMIT 1
"""

_BRANDS_SELECT = """
    SELECT id, slug, name, logo_url
    FROM brands
    ORDER BY name ASC
"""

_SERIES_BY_BRAND = """
    SELECT s.id, s.slug, s.name, s.cover_url, s.total_count
    FROM series s
    JOIN brands b ON b.id = s.brand_id
    WHERE b.slug = %s
    ORDER BY s.name ASC
"""

_STYLES_BY_BRAND_SERIES = """
    SELECT cp.id, cp.external_id, cp.title, cp.image_url
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
        brand_slug=row.get("brand_slug"),
        brand_name=row.get("brand_name"),
        series_slug=row.get("series_slug"),
        series_name=row.get("series_name"),
    )


def get_all_products(
    conn: psycopg2.extensions.connection,
    *,
    query: str | None = None,
    brand_slug: str | None = None,
    series_slug: str | None = None,
) -> list[CatalogProduct]:
    sql = _PRODUCT_SELECT + " WHERE 1=1"
    params: list[str] = []

    if brand_slug:
        sql += " AND b.slug = %s"
        params.append(brand_slug)
    if series_slug:
        sql += " AND s.slug = %s"
        params.append(series_slug)
    if query:
        q = f"%{query.strip().lower()}%"
        sql += " AND (LOWER(cp.title) LIKE %s OR LOWER(b.name) LIKE %s OR LOWER(s.name) LIKE %s)"
        params.extend([q, q, q])

    sql += " ORDER BY cp.updated_at DESC"

    with conn.cursor() as cur:
        cur.execute(sql, params)
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
        {
            "id": str(r["id"]),
            "slug": r["slug"],
            "name": r["name"],
            "image": r.get("logo_url") or "",
        }
        for r in rows
    ]


def get_series_by_brand_slug(
    conn: psycopg2.extensions.connection, brand_slug: str
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_SERIES_BY_BRAND, (brand_slug,))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["id"]),
            "slug": r["slug"],
            "name": r["name"],
            "image": r.get("cover_url") or "",
            "count": int(r.get("total_count") or 0),
        }
        for r in rows
    ]


_BRANDS_SEARCH = """
    SELECT id, slug, name, logo_url
    FROM brands
    WHERE LOWER(name) LIKE %s
    ORDER BY name ASC
    LIMIT 12
"""

_SERIES_SEARCH = """
    SELECT
        s.id,
        s.slug,
        s.name,
        s.cover_url,
        s.total_count,
        b.slug AS brand_slug,
        b.name AS brand_name
    FROM series s
    JOIN brands b ON b.id = s.brand_id
    WHERE LOWER(s.name) LIKE %s OR LOWER(b.name) LIKE %s
    ORDER BY s.name ASC
    LIMIT 24
"""


def search_brands(conn: psycopg2.extensions.connection, query: str) -> list[dict]:
    pattern = f"%{query.strip().lower()}%"
    with conn.cursor() as cur:
        cur.execute(_BRANDS_SEARCH, (pattern,))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["id"]),
            "slug": r["slug"],
            "name": r["name"],
            "image": r.get("logo_url") or "",
        }
        for r in rows
    ]


def search_series(conn: psycopg2.extensions.connection, query: str) -> list[dict]:
    pattern = f"%{query.strip().lower()}%"
    with conn.cursor() as cur:
        cur.execute(_SERIES_SEARCH, (pattern, pattern))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["id"]),
            "slug": r["slug"],
            "name": r["name"],
            "image": r.get("cover_url") or "",
            "count": int(r.get("total_count") or 0),
            "brand_slug": r["brand_slug"],
            "brand_name": r["brand_name"],
        }
        for r in rows
    ]


def get_styles_by_brand_series_slug(
    conn: psycopg2.extensions.connection, brand_slug: str, series_slug: str
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_STYLES_BY_BRAND_SERIES, (brand_slug, series_slug))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["external_id"] or r["id"]),
            "name": r["title"],
            "image": r.get("image_url") or "",
        }
        for r in rows
    ]
