from __future__ import annotations

import uuid

import psycopg2.extensions
from psycopg2.extras import execute_values

from domain.entities import CreateListingInput, Listing, SplitBoxSlotInput
from infrastructure.db.repositories.collection_repository import (
    _resolve_catalog_product_id,
)

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
        l.shipping_methods,
        l.allow_swap,
        l.allow_bargain,
        l.split_box_group_id,
        l.split_box_slot_id,
        ss.status AS split_box_slot_status,
        l.catalog_product_id,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        i.name AS ip_name,
        ps.name AS series_name,
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
    LEFT JOIN ips i ON i.id = l.ip_id
    LEFT JOIN series ps ON ps.id = l.series_id
    LEFT JOIN split_box_slots ss ON ss.id = l.split_box_slot_id
    WHERE l.status = 'active' AND l.deleted_at IS NULL
      AND (l.split_box_slot_id IS NULL OR ss.status = 'available')
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
        l.shipping_methods,
        l.allow_swap,
        l.allow_bargain,
        l.split_box_group_id,
        l.split_box_slot_id,
        l.catalog_product_id,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        i.name AS ip_name,
        ps.name AS series_name,
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
    LEFT JOIN ips i ON i.id = l.ip_id
    LEFT JOIN series ps ON ps.id = l.series_id
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
        l.shipping_methods,
        l.allow_swap,
        l.allow_bargain,
        l.split_box_group_id,
        l.split_box_slot_id,
        ss.status AS split_box_slot_status,
        l.catalog_product_id,
        l.created_at,
        l.seller_id,
        u.display_name AS seller_name,
        b.name AS brand_name,
        i.name AS ip_name,
        ps.name AS series_name,
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
    LEFT JOIN ips i ON i.id = l.ip_id
    LEFT JOIN series ps ON ps.id = l.series_id
    LEFT JOIN split_box_slots ss ON ss.id = l.split_box_slot_id
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


def _parse_shipping_methods_raw(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        s = raw.strip()
        if s.startswith("{") and s.endswith("}"):
            inner = s[1:-1].strip()
            if not inner:
                return []
            return [part.strip().strip('"') for part in inner.split(",") if part.strip()]
        return [s]
    return list(raw)


def _shipping_labels_from_row(row: dict) -> list[str]:
    raw = _parse_shipping_methods_raw(row.get("shipping_methods"))
    if raw:
        labels = [_SHIPPING_UI.get(str(m), str(m)) for m in raw]
        return [label for label in labels if label]
    single = row.get("shipping_method")
    if single:
        return [_SHIPPING_UI.get(str(single), str(single))]
    return ["7-11 店到店"]


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "NT$ 0"
    major = float(amount)
    symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency or "TWD", "NT$")
    return f"{symbol} {major:.0f}" if major == int(major) else f"{symbol} {major:.2f}"


def _parse_price_amount(price_str: str) -> int:
    import re
    digits = re.sub(r"[^0-9.]", "", price_str)
    if not digits:
        return 0
    return int(round(float(digits)))


def _to_slug(value: str) -> str:
    import re
    slug = re.sub(r"\s+", "-", (value or "").strip().lower())
    slug = re.sub(r"[^\w\u4e00-\u9fff-]", "", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug or "unknown"


_OTHER_IP = "其他 IP"


def _ensure_brand_ip_and_product_series_ids(
    cur,
    brand_name: str | None,
    ip_name: str | None = None,
    product_series_name: str | None = None,
) -> tuple[str | None, str | None, str | None]:
    brand = (brand_name or "").strip()
    ip = (ip_name or "").strip()
    line = (product_series_name or "").strip()
    if not brand:
        return None, None, None

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

    if not ip and not line:
        return brand_id, None, None

    if not ip and line:
        cur.execute(
            """
            SELECT COUNT(DISTINCT i.id) AS ip_count
            FROM series s
            JOIN ips i ON i.id = s.ip_id
            WHERE s.brand_id = %s AND s.name = %s
            """,
            (brand_id, line),
        )
        distinct_ips = int(cur.fetchone()["ip_count"] or 0)
        if distinct_ips == 1:
            cur.execute(
                """
                SELECT i.id AS ip_id, s.id AS series_id
                FROM series s
                JOIN ips i ON i.id = s.ip_id
                WHERE s.brand_id = %s AND s.name = %s
                LIMIT 1
                """,
                (brand_id, line),
            )
            row = cur.fetchone()
            if row:
                return brand_id, str(row["ip_id"]), str(row["series_id"])
        ip = _OTHER_IP
    elif not ip:
        ip = _OTHER_IP

    ip_slug = _to_slug(ip)
    cur.execute(
        """
        INSERT INTO ips (brand_id, slug, name)
        VALUES (%s, %s, %s)
        ON CONFLICT (brand_id, slug)
        DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
        """,
        (brand_id, ip_slug, ip),
    )
    ip_id = str(cur.fetchone()["id"])

    if not line:
        return brand_id, ip_id, None

    line_slug = _to_slug(line)
    cur.execute(
        """
        INSERT INTO series (brand_id, ip_id, slug, name)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (brand_id, ip_id, slug)
        DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
        """,
        (brand_id, ip_id, line_slug, line),
    )
    series_id = str(cur.fetchone()["id"])
    return brand_id, ip_id, series_id


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
        ip=row.get("ip_name") or "",
        series=row.get("series_name") or "",
        catalog_product_id=str(row["catalog_product_id"]) if row.get("catalog_product_id") else None,
        condition=_CONDITION_UI.get(str(row.get("condition") or ""), str(row.get("condition") or "")),
        trade_mode=_TRADE_MODE_UI.get(str(row.get("trade_mode") or ""), str(row.get("trade_mode") or "")),
        shipping_methods=_shipping_labels_from_row(row),
        shipping=_shipping_labels_from_row(row)[0],
        allow_swap=bool(row.get("allow_swap", False)),
        allow_bargain=bool(row.get("allow_bargain", False)),
        image=image_url,
        images=image_urls,
        created_at=str(row.get("created_at") or ""),
        seller_name=row.get("seller_name") or "Unknown",
        seller_id=str(row.get("seller_id") or ""),
        split_box_group_id=str(row["split_box_group_id"]) if row.get("split_box_group_id") else None,
        split_box_slot_id=str(row["split_box_slot_id"]) if row.get("split_box_slot_id") else None,
        split_box_slot_status=str(row["split_box_slot_status"]) if row.get("split_box_slot_status") else None,
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
    ui_methods = [m for m in (data.shipping_methods or []) if m]
    if not ui_methods and data.shipping:
        ui_methods = [data.shipping]
    methods_db = [_SHIPPING_MAP.get(m, "711_store") for m in ui_methods] or ["711_store"]
    shipping_db = methods_db[0]

    with conn.cursor() as cur:
        brand_id, ip_id, series_id = _ensure_brand_ip_and_product_series_ids(
            cur, data.brand, data.ip or None, data.series
        )
        catalog_product_id = None
        raw_catalog_id = (data.catalog_product_id or "").strip()
        if raw_catalog_id:
            catalog_product_id = _resolve_catalog_product_id(cur, raw_catalog_id)
        cur.execute(
            """
            INSERT INTO listings
              (id, seller_id, catalog_product_id, brand_id, ip_id, series_id, title, item_name, quantity, price_amount, price_currency,
               description, condition, trade_mode, shipping_method, shipping_methods,
               allow_swap, allow_bargain, status,
               split_box_group_id, split_box_slot_id)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
               %s::listing_condition_enum,
               %s::trade_mode_enum,
               %s::shipping_method_enum,
               %s::shipping_method_enum[],
               %s, %s, 'active',
               %s, %s)
            """,
            (
                listing_id,
                user_id,
                catalog_product_id,
                brand_id,
                ip_id,
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
                methods_db,
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


def _catalog_product_uuids_by_external(
    cur, external_ids: list[str]
) -> dict[str, str | None]:
    """external_id 或 catalog UUID 字串 → catalog_products.id (UUID)。"""
    keys = list({e.strip() for e in external_ids if e and e.strip()})
    if not keys:
        return {}
    cur.execute(
        """
        SELECT id, external_id
        FROM catalog_products
        WHERE external_id = ANY(%s) OR id::text = ANY(%s)
        """,
        (keys, keys),
    )
    by_key: dict[str, str] = {}
    for row in cur.fetchall():
        uuid_id = str(row["id"])
        ext = row.get("external_id")
        if ext:
            by_key[str(ext)] = uuid_id
        by_key[uuid_id] = uuid_id
    return {key: by_key.get(key) for key in keys}


def insert_split_box_slot_listings(
    cur,
    organizer_id: str,
    group_id: str,
    brand_id: str | None,
    ip_id: str | None,
    series_id: str | None,
    *,
    group_title: str,
    description: str,
    shipping_db: str,
    methods_db: list[str],
    entries: list[tuple[str, str, SplitBoxSlotInput, int]],
) -> None:
    """為拆盒團可認領款式批次建立 listing（不 commit、不 reload）。"""
    if not entries:
        return

    catalog_ids = _catalog_product_uuids_by_external(
        cur, [slot.catalog_product_id for _, _, slot, _ in entries]
    )

    desc_base = description or ""
    listing_rows: list[tuple] = []
    image_rows: list[tuple] = []

    for listing_id, slot_id, slot, slot_amount in entries:
        catalog_product_id = catalog_ids.get(slot.catalog_product_id)
        listing_rows.append(
            (
                listing_id,
                organizer_id,
                catalog_product_id,
                brand_id,
                ip_id,
                series_id,
                f"{group_title} · {slot.product_title}",
                slot.product_title,
                1,
                slot_amount,
                "TWD",
                desc_base or f"拆盒團認領：{group_title}",
                "sealed",
                "group_buy",
                shipping_db,
                methods_db,
                False,
                False,
                group_id,
                slot_id,
            )
        )
        image_url = (slot.product_image or "").strip()
        if image_url:
            image_rows.append((listing_id, image_url, 0))

    execute_values(
        cur,
        """
        INSERT INTO listings
          (id, seller_id, catalog_product_id, brand_id, ip_id, series_id, title, item_name, quantity, price_amount, price_currency,
           description, condition, trade_mode, shipping_method, shipping_methods,
           allow_swap, allow_bargain, status,
           split_box_group_id, split_box_slot_id)
        VALUES %s
        """,
        listing_rows,
        template=(
            "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,"
            " %s::listing_condition_enum, %s::trade_mode_enum,"
            " %s::shipping_method_enum, %s::shipping_method_enum[],"
            " %s, %s, 'active', %s, %s)"
        ),
        page_size=200,
    )
    if image_rows:
        execute_values(
            cur,
            """
            INSERT INTO listing_images (listing_id, url, sort_order)
            VALUES %s
            """,
            image_rows,
            template="(%s, %s, %s)",
            page_size=200,
        )


def _listing_owned_by_seller(
    cur: psycopg2.extensions.cursor, listing_id: str, user_id: str
) -> dict | None:
    cur.execute(
        """
        SELECT id, seller_id, split_box_slot_id
        FROM listings
        WHERE id = %s AND deleted_at IS NULL
        """,
        (listing_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    row = dict(row)
    if str(row.get("seller_id") or "") != user_id:
        return None
    return row


def update_listing(
    conn: psycopg2.extensions.connection,
    listing_id: str,
    user_id: str,
    data: CreateListingInput,
) -> Listing | None:
    amount = _parse_price_amount(data.price)
    condition_db = _CONDITION_MAP.get(data.condition, "sealed")
    trade_mode_db = _TRADE_MODE_MAP.get(data.trade_mode, "sell")
    ui_methods = [m for m in (data.shipping_methods or []) if m]
    if not ui_methods and data.shipping:
        ui_methods = [data.shipping]
    methods_db = [_SHIPPING_MAP.get(m, "711_store") for m in ui_methods] or ["711_store"]
    shipping_db = methods_db[0]

    with conn.cursor() as cur:
        owned = _listing_owned_by_seller(cur, listing_id, user_id)
        if not owned:
            return None

        is_split_slot = bool(owned.get("split_box_slot_id"))
        if is_split_slot:
            cur.execute(
                """
                UPDATE listings
                SET title = %s,
                    item_name = %s,
                    description = %s,
                    shipping_method = %s::shipping_method_enum,
                    shipping_methods = %s::shipping_method_enum[],
                    updated_at = now()
                WHERE id = %s
                """,
                (
                    data.title,
                    data.item_name,
                    data.description,
                    shipping_db,
                    methods_db,
                    listing_id,
                ),
            )
        else:
            brand_id, ip_id, series_id = _ensure_brand_ip_and_product_series_ids(
                cur, data.brand, data.ip or None, data.series
            )
            catalog_product_id = None
            raw_catalog_id = (data.catalog_product_id or "").strip()
            if raw_catalog_id:
                catalog_product_id = _resolve_catalog_product_id(cur, raw_catalog_id)
            cur.execute(
                """
                UPDATE listings
                SET catalog_product_id = %s,
                    brand_id = %s,
                    ip_id = %s,
                    series_id = %s,
                    title = %s,
                    item_name = %s,
                    quantity = %s,
                    price_amount = %s,
                    price_currency = %s,
                    description = %s,
                    condition = %s::listing_condition_enum,
                    trade_mode = %s::trade_mode_enum,
                    shipping_method = %s::shipping_method_enum,
                    shipping_methods = %s::shipping_method_enum[],
                    allow_swap = %s,
                    allow_bargain = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (
                    catalog_product_id,
                    brand_id,
                    ip_id,
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
                    methods_db,
                    data.allow_swap,
                    data.allow_bargain,
                    listing_id,
                ),
            )

        cur.execute("DELETE FROM listing_images WHERE listing_id = %s", (listing_id,))
        raw_images = [img.strip() for img in (data.images or []) if isinstance(img, str) and img.strip()]
        if not raw_images and data.image and data.image.strip():
            raw_images = [data.image.strip()]
        for sort_order, image_url in enumerate(raw_images[:9]):
            cur.execute(
                """
                INSERT INTO listing_images (listing_id, url, sort_order)
                VALUES (%s, %s, %s)
                """,
                (listing_id, image_url, sort_order),
            )
        conn.commit()

    return get_listing_by_id(conn, listing_id)


def soft_delete_listing(
    conn: psycopg2.extensions.connection, listing_id: str, user_id: str
) -> bool:
    with conn.cursor() as cur:
        owned = _listing_owned_by_seller(cur, listing_id, user_id)
        if not owned:
            return False
        cur.execute(
            """
            SELECT 1 FROM orders
            WHERE listing_id = %s
              AND status NOT IN ('completed', 'cancelled')
              AND deleted_at IS NULL
            LIMIT 1
            """,
            (listing_id,),
        )
        if cur.fetchone():
            raise ValueError("此貼文有進行中的訂單，無法刪除")
        cur.execute("DELETE FROM cart_items WHERE listing_id = %s", (listing_id,))
        cur.execute(
            """
            UPDATE listings
            SET deleted_at = now(),
                status = 'removed'::listing_status_enum,
                updated_at = now()
            WHERE id = %s
            """,
            (listing_id,),
        )
        conn.commit()
    return True
