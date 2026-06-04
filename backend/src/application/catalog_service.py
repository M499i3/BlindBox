from __future__ import annotations

import re

import psycopg2.extensions

from domain.entities import CatalogProduct
from infrastructure.db.repositories.catalog_repository import (
    get_all_brands,
    get_all_products,
    get_ips_by_brand_slug,
    get_product_by_id,
    get_product_series_by_brand_slug,
    get_styles_by_brand_series_slug,
    search_brands,
    search_series,
)

_BRAND_RULES: list[tuple[str, str]] = [
    ("SKULLPANDA", "SKULLPANDA"),
    ("PUCKY", "PUCKY"),
    ("DIMOO", "Dimoo"),
    ("MOLLY", "Molly"),
    ("LABUBU", "LABUBU"),
    ("CHAKA", "CHAKA"),
]


def derive_brand_label(title: str) -> str:
    u = title.upper()
    for keyword, label in _BRAND_RULES:
        if keyword in u:
            return label
    if "泡泡" in title:
        return "Pop Mart"
    return "Pop Mart"


def _normalize_brand_slug(brand: str | None) -> str | None:
    if not brand:
        return None
    return re.sub(r"[_\-]+", "-", brand.strip().lower()).strip("-") or None


def list_products(
    conn: psycopg2.extensions.connection,
    query: str | None = None,
    brand: str | None = None,
    ip: str | None = None,
    series: str | None = None,
) -> list[CatalogProduct]:
    return get_all_products(
        conn,
        query=query,
        brand_slug=_normalize_brand_slug(brand),
        ip_slug=ip.strip() if ip else None,
        series_slug=series.strip() if series else None,
    )


def get_product(
    conn: psycopg2.extensions.connection, product_id: str
) -> CatalogProduct | None:
    return get_product_by_id(conn, product_id)


def list_brands(conn: psycopg2.extensions.connection) -> list[dict]:
    return get_all_brands(conn)


def list_ips(
    conn: psycopg2.extensions.connection, brand_slug: str
) -> list[dict]:
    return get_ips_by_brand_slug(conn, brand_slug)


def list_series(
    conn: psycopg2.extensions.connection,
    brand_slug: str,
    *,
    ip_slug: str | None = None,
) -> list[dict]:
    return get_product_series_by_brand_slug(conn, brand_slug, ip_slug=ip_slug)


def list_styles(
    conn: psycopg2.extensions.connection, brand_slug: str, series_slug: str
) -> list[dict]:
    return get_styles_by_brand_series_slug(conn, brand_slug, series_slug)


def catalog_search(
    conn: psycopg2.extensions.connection, query: str
) -> dict:
    q = query.strip()
    if not q:
        return {"brands": [], "series": [], "products": []}
    return {
        "brands": search_brands(conn, q),
        "series": search_series(conn, q),
        "products": get_all_products(conn, query=q)[:40],
    }
