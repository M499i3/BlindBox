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
        i.slug AS ip_slug,
        i.name AS ip_name,
        ps.slug AS series_slug,
        ps.name AS series_name
    FROM catalog_products cp
    LEFT JOIN ips i ON i.id = cp.ip_id
    LEFT JOIN brands b ON b.id = i.brand_id
    LEFT JOIN series ps ON ps.id = cp.series_id
"""

_PRODUCT_BY_EXTERNAL_ID = _PRODUCT_SELECT + """
    WHERE cp.external_id = %s OR cp.id::text = %s
    LIMIT 1
"""

_BRANDS_SELECT = """
    SELECT id, slug, name, logo_url
    FROM brands
    ORDER BY name ASC
"""

_IPS_BY_BRAND = """
    SELECT i.id, i.slug, i.name, i.cover_url, i.total_count
    FROM ips i
    JOIN brands b ON b.id = i.brand_id
    WHERE b.slug = %s
    ORDER BY i.name ASC
"""

_PRODUCT_SERIES_BY_BRAND = """
    SELECT
        s.id,
        s.slug,
        s.name,
        s.cover_url,
        s.total_count,
        i.slug AS ip_slug,
        i.name AS ip_name
    FROM series s
    JOIN ips i ON i.id = s.ip_id
    JOIN brands b ON b.id = s.brand_id
    WHERE b.slug = %s
    ORDER BY s.name ASC
"""

_PRODUCT_SERIES_BY_BRAND_IP = _PRODUCT_SERIES_BY_BRAND + """
    AND i.slug = %s
"""

_STYLES_BY_BRAND_SERIES = """
    SELECT cp.id, cp.external_id, cp.title, cp.image_url
    FROM catalog_products cp
    JOIN series ps ON ps.id = cp.series_id
    JOIN brands b ON b.id = ps.brand_id
    JOIN ips i ON i.id = ps.ip_id
    WHERE b.slug = %s AND ps.slug = %s AND i.slug = %s
    ORDER BY cp.title ASC
"""


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "HK$ 0.00"
    major = float(amount)
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
        ip_slug=row.get("ip_slug"),
        ip_name=row.get("ip_name"),
        series_slug=row.get("series_slug"),
        series_name=row.get("series_name"),
    )


def get_all_products(
    conn: psycopg2.extensions.connection,
    *,
    query: str | None = None,
    brand_slug: str | None = None,
    ip_slug: str | None = None,
    series_slug: str | None = None,
) -> list[CatalogProduct]:
    sql = _PRODUCT_SELECT + " WHERE 1=1"
    params: list[str] = []

    if brand_slug:
        sql += " AND b.slug = %s"
        params.append(brand_slug)
    if ip_slug:
        sql += " AND i.slug = %s"
        params.append(ip_slug)
    if series_slug:
        sql += " AND ps.slug = %s"
        params.append(series_slug)
    if query:
        q = f"%{query.strip().lower()}%"
        sql += (
            " AND (LOWER(cp.title) LIKE %s OR LOWER(b.name) LIKE %s"
            " OR LOWER(i.name) LIKE %s OR LOWER(ps.name) LIKE %s)"
        )
        params.extend([q, q, q, q])

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


def get_ips_by_brand_slug(
    conn: psycopg2.extensions.connection, brand_slug: str
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_IPS_BY_BRAND, (brand_slug,))
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


def get_product_series_by_brand_slug(
    conn: psycopg2.extensions.connection,
    brand_slug: str,
    *,
    ip_slug: str | None = None,
) -> list[dict]:
    with conn.cursor() as cur:
        if ip_slug:
            cur.execute(_PRODUCT_SERIES_BY_BRAND_IP, (brand_slug, ip_slug))
        else:
            cur.execute(_PRODUCT_SERIES_BY_BRAND, (brand_slug,))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["id"]),
            "slug": r["slug"],
            "name": r["name"],
            "image": r.get("cover_url") or "",
            "count": int(r.get("total_count") or 0),
            "ip_slug": r.get("ip_slug"),
            "ip_name": r.get("ip_name"),
        }
        for r in rows
    ]


# 向後相容：舊名稱曾回傳 IP 列
get_series_by_brand_slug = get_ips_by_brand_slug


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
        b.name AS brand_name,
        i.name AS ip_name
    FROM series s
    JOIN ips i ON i.id = s.ip_id
    JOIN brands b ON b.id = s.brand_id
    WHERE LOWER(s.name) LIKE %s OR LOWER(b.name) LIKE %s OR LOWER(i.name) LIKE %s
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
        cur.execute(_SERIES_SEARCH, (pattern, pattern, pattern))
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
            "ip_name": r.get("ip_name"),
        }
        for r in rows
    ]


def get_styles_by_brand_series_slug(
    conn: psycopg2.extensions.connection,
    brand_slug: str,
    series_slug: str,
    ip_slug: str,
) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(_STYLES_BY_BRAND_SERIES, (brand_slug, series_slug, ip_slug))
        rows = cur.fetchall()
    return [
        {
            "id": str(r["external_id"] or r["id"]),
            "name": r["title"],
            "image": r.get("image_url") or "",
        }
        for r in rows
    ]
