from __future__ import annotations

import re

import psycopg2.extensions

from domain.entities import CatalogProduct
from infrastructure.db.repositories.catalog_repository import (
    get_all_brands,
    get_all_products,
    get_product_by_id,
    get_series_by_brand_slug,
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


def list_products(
    conn: psycopg2.extensions.connection,
    query: str | None = None,
    brand: str | None = None,
) -> list[CatalogProduct]:
    products = get_all_products(conn)

    if query:
        q = query.strip().lower()
        products = [
            p
            for p in products
            if q in p.title.lower() or q in derive_brand_label(p.title).lower()
        ]

    if brand:
        raw = re.sub(r"[_\-]", " ", brand).strip().lower()
        products = [
            p
            for p in products
            if derive_brand_label(p.title).lower() == raw
            or raw in p.title.lower()
        ]

    return products


def get_product(
    conn: psycopg2.extensions.connection, product_id: str
) -> CatalogProduct | None:
    return get_product_by_id(conn, product_id)


def list_brands(conn: psycopg2.extensions.connection) -> list[dict]:
    return get_all_brands(conn)


def list_series(
    conn: psycopg2.extensions.connection, brand_slug: str
) -> list[dict]:
    return get_series_by_brand_slug(conn, brand_slug)
