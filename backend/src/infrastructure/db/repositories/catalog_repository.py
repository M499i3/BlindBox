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


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "NT$0"
    major = amount / 100
    symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency or "TWD", "NT$")
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
