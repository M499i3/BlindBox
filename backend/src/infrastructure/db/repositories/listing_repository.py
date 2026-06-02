from __future__ import annotations

import uuid

import psycopg2.extensions

from domain.entities import CreateListingInput, Listing

_LIST_SELECT = """
    SELECT
        l.id,
        l.title,
        l.item_name,
        l.price_amount,
        l.price_currency,
        l.quantity,
        l.description,
        l.condition,
        l.trade_mode,
        l.shipping_method,
        l.allow_swap,
        l.allow_bargain,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        s.name AS series_name,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.sort_order
            LIMIT 1
        ) AS image_url,
        (
            SELECT COALESCE(array_agg(li.url ORDER BY li.sort_order), ARRAY[]::text[])
            FROM listing_images li
            WHERE li.listing_id = l.id
        ) AS image_urls
    FROM listings l
    LEFT JOIN users u ON u.id = l.seller_id
    LEFT JOIN brands b ON b.id = l.brand_id
    LEFT JOIN series s ON s.id = l.series_id
    WHERE l.status = 'active' AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
"""

_MY_LISTINGS_SELECT = """
    SELECT
        l.id,
        l.title,
        l.item_name,
        l.price_amount,
        l.price_currency,
        l.quantity,
        l.description,
        l.condition,
        l.trade_mode,
        l.shipping_method,
        l.allow_swap,
        l.allow_bargain,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        s.name AS series_name,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.sort_order
            LIMIT 1
        ) AS image_url,
        (
            SELECT COALESCE(array_agg(li.url ORDER BY li.sort_order), ARRAY[]::text[])
            FROM listing_images li
            WHERE li.listing_id = l.id
        ) AS image_urls
    FROM listings l
    LEFT JOIN users u ON u.id = l.seller_id
    LEFT JOIN brands b ON b.id = l.brand_id
    LEFT JOIN series s ON s.id = l.series_id
    WHERE l.status = 'active' AND l.deleted_at IS NULL AND l.seller_id = %s
    ORDER BY l.created_at DESC
"""

_LISTING_BY_ID = """
    SELECT
        l.id,
        l.title,
        l.item_name,
        l.price_amount,
        l.price_currency,
        l.quantity,
        l.description,
        l.condition,
        l.trade_mode,
        l.shipping_method,
        l.allow_swap,
        l.allow_bargain,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        s.name AS series_name,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.sort_order
            LIMIT 1
        ) AS image_url,
        (
            SELECT COALESCE(array_agg(li.url ORDER BY li.sort_order), ARRAY[]::text[])
            FROM listing_images li
            WHERE li.listing_id = l.id
        ) AS image_urls
    FROM listings l
    LEFT JOIN users u ON u.id = l.seller_id
    LEFT JOIN brands b ON b.id = l.brand_id
    LEFT JOIN series s ON s.id = l.series_id
    WHERE l.id = %s AND l.deleted_at IS NULL
    LIMIT 1
"""

# UI 文字 → DB enum 對應
_CONDITION_MAP = {
    '全新未拆': 'sealed',
    '已拆盒': 'opened',
    '展示過': 'displayed',
}
_TRADE_MODE_MAP = {
    '我要賣': 'sell',
    '我想換': 'swap',
    '加入拆盒團': 'group_buy',
}
_SHIPPING_MAP = {
    '7-11 店到店': '711_store',
    '全家 店到店': 'family_store',
    '面交 (特定區域)': 'in_person',
    '郵局包裹': 'post_office',
}
# DB enum → UI 文字
_CONDITION_UI = {v: k for k, v in _CONDITION_MAP.items()}
_TRADE_MODE_UI = {v: k for k, v in _TRADE_MODE_MAP.items()}
_SHIPPING_UI = {v: k for k, v in _SHIPPING_MAP.items()}


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "NT$ 0"
    major = amount / 100
    symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency or "TWD", "NT$")
    return f"{symbol} {major:.0f}" if major == int(major) else f"{symbol} {major:.2f}"


def _parse_price_amount(price_str: str) -> int:
    import re
    digits = re.sub(r"[^0-9.]", "", price_str)
    if not digits:
        return 0
    return round(float(digits) * 100)


def _to_slug(value: str) -> str:
    import re
    slug = re.sub(r"\s+", "-", (value or "").strip().lower())
    slug = re.sub(r"[^\w\u4e00-\u9fff-]", "", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug or "unknown"


def _ensure_brand_and_series_ids(
    cur,
    brand_name: str | None,
    series_name: str | None,
) -> tuple[str | None, str | None]:
    brand = (brand_name or "").strip()
    series = (series_name or "").strip()
    if not brand:
        return None, None

    brand_slug = _to_slug(brand)
    cur.execute(
        """
        INSERT INTO brands (slug, name)
        VALUES (%s, %s)
        ON CONFLICT (slug)
        DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
        """,
        (brand_slug, brand),
    )
    brand_id = str(cur.fetchone()["id"])

    if not series:
        return brand_id, None

    series_slug = _to_slug(series)
    cur.execute(
        """
        INSERT INTO series (brand_id, slug, name)
        VALUES (%s, %s, %s)
        ON CONFLICT (brand_id, slug)
        DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
        """,
        (brand_id, series_slug, series),
    )
    series_id = str(cur.fetchone()["id"])
    return brand_id, series_id


def _row_to_listing(row: dict) -> Listing:
    image_urls = [url for url in (row.get("image_urls") or []) if isinstance(url, str) and url]
    image_url = row.get("image_url") or (image_urls[0] if image_urls else "")
    return Listing(
        id=str(row["id"]),
        title=row["title"] or "",
        item_name=row.get("item_name") or "",
        quantity=int(row.get("quantity") or 1),
        price=_format_price(row.get("price_amount"), row.get("price_currency")),
        description=row.get("description") or "",
        brand=row.get("brand_name") or "",
        series=row.get("series_name") or "",
        condition=_CONDITION_UI.get(str(row.get("condition") or ""), str(row.get("condition") or "")),
        trade_mode=_TRADE_MODE_UI.get(str(row.get("trade_mode") or ""), str(row.get("trade_mode") or "")),
        shipping=_SHIPPING_UI.get(str(row.get("shipping_method") or ""), str(row.get("shipping_method") or "")),
        allow_swap=bool(row.get("allow_swap", False)),
        allow_bargain=bool(row.get("allow_bargain", False)),
        image=image_url,
        images=image_urls,
        created_at=str(row.get("created_at") or ""),
        seller_name=row.get("seller_name") or "Unknown",
        seller_id=str(row.get("seller_id") or ""),
    )


def get_active_listings(conn: psycopg2.extensions.connection) -> list[Listing]:
    with conn.cursor() as cur:
        cur.execute(_LIST_SELECT)
        rows = cur.fetchall()
    return [_row_to_listing(dict(r)) for r in rows]


def get_my_listings(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[Listing]:
    with conn.cursor() as cur:
        cur.execute(_MY_LISTINGS_SELECT, (user_id,))
        rows = cur.fetchall()
    return [_row_to_listing(dict(r)) for r in rows]


def get_listing_by_id(
    conn: psycopg2.extensions.connection, listing_id: str
) -> Listing | None:
    with conn.cursor() as cur:
        cur.execute(_LISTING_BY_ID, (listing_id,))
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_listing(dict(row))


def create_listing(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: CreateListingInput,
    *,
    split_box_group_id: str | None = None,
    split_box_slot_id: str | None = None,
) -> Listing:
    listing_id = str(uuid.uuid4())
    amount = _parse_price_amount(data.price)
    condition_db = _CONDITION_MAP.get(data.condition, "sealed")
    trade_mode_db = _TRADE_MODE_MAP.get(data.trade_mode, "sell")
    shipping_db = _SHIPPING_MAP.get(data.shipping or "", "711_store")

    with conn.cursor() as cur:
        brand_id, series_id = _ensure_brand_and_series_ids(cur, data.brand, data.series)
        cur.execute(
            """
            INSERT INTO listings
              (id, seller_id, brand_id, series_id, title, item_name, quantity, price_amount, price_currency,
               description, condition, trade_mode, shipping_method,
               allow_swap, allow_bargain, status,
               split_box_group_id, split_box_slot_id)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
               %s::listing_condition_enum,
               %s::trade_mode_enum,
               %s::shipping_method_enum,
               %s, %s, 'active',
               %s, %s)
            """,
            (
                listing_id,
                user_id,
                brand_id,
                series_id,
                data.title,
                data.item_name,
                data.quantity,
                amount,
                "TWD",
                data.description,
                condition_db,
                trade_mode_db,
                shipping_db,
                data.allow_swap,
                data.allow_bargain,
                split_box_group_id,
                split_box_slot_id,
            ),
        )
        raw_images = [img.strip() for img in (data.images or []) if isinstance(img, str) and img.strip()]
        if not raw_images and data.image and data.image.strip():
            raw_images = [data.image.strip()]

        # DB 會限制 sort_order 0~8，這裡先在應用層做同樣的防線
        for sort_order, image_url in enumerate(raw_images[:9]):
            cur.execute(
                """
                INSERT INTO listing_images (listing_id, url, sort_order)
                VALUES (%s, %s, %s)
                """,
                (listing_id, image_url, sort_order),
            )
        conn.commit()

    result = get_listing_by_id(conn, listing_id)
    assert result is not None
    return result
