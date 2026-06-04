from __future__ import annotations

import uuid
from datetime import datetime, timezone

import psycopg2.extensions

from domain.entities import OrderSummary

_STATUS_LABELS: dict[str, str] = {
    "pending": "待出貨",
    "shipped": "已寄出",
    "delivered": "已送達",
    "completed": "已完成",
    "cancelled": "已取消",
    "disputed": "爭議中",
}


def _format_price(amount: int | None, currency: str | None) -> str:
    if amount is None or amount == 0:
        return "NT$ 0"
    major = float(amount)
    symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency or "TWD", "NT$")
    return f"{symbol} {major:.0f}" if major == int(major) else f"{symbol} {major:.2f}"


def _orders_sql(role: str) -> tuple[str, str, str]:
    if role == "seller":
        return (
            "o.seller_id = %s",
            "u.display_name AS counterparty_name",
            "JOIN users u ON u.id = o.buyer_id",
        )
    return (
        "o.buyer_id = %s",
        "u.display_name AS counterparty_name",
        "JOIN users u ON u.id = o.seller_id",
    )


def get_orders_for_user(
    conn: psycopg2.extensions.connection,
    user_id: str,
    *,
    role: str = "buyer",
) -> list[OrderSummary]:
    where, counterparty_select, user_join = _orders_sql(role)
    sql = f"""
        SELECT
            o.id,
            o.listing_id,
            o.status,
            o.amount,
            o.currency,
            o.created_at,
            l.title,
            {counterparty_select},
            (
                SELECT li.url FROM listing_images li
                WHERE li.listing_id = l.id
                ORDER BY li.sort_order
                LIMIT 1
            ) AS image_url
        FROM orders o
        JOIN listings l ON l.id = o.listing_id
        {user_join}
        WHERE {where} AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
    """
    with conn.cursor() as cur:
        cur.execute(sql, (user_id,))
        rows = cur.fetchall()

    result: list[OrderSummary] = []
    for row in rows:
        r = dict(row)
        status = str(r.get("status") or "")
        result.append(
            OrderSummary(
                id=str(r["id"]),
                listing_id=str(r["listing_id"]),
                title=r.get("title") or "",
                image=r.get("image_url") or "",
                counterparty_name=r.get("counterparty_name") or "",
                status=status,
                status_label=_STATUS_LABELS.get(status, status),
                total=_format_price(r.get("amount"), r.get("currency")),
                created_at=str(r.get("created_at") or ""),
            )
        )
    return result


def get_order_by_id(
    conn: psycopg2.extensions.connection, order_id: str
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, listing_id, buyer_id, seller_id, status
            FROM orders
            WHERE id = %s AND deleted_at IS NULL
            """,
            (order_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def create_order(
    conn: psycopg2.extensions.connection,
    *,
    listing_id: str,
    buyer_id: str,
    seller_id: str,
    amount: int,
    currency: str,
    shipping_method: str,
) -> dict:
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO orders (
                id, listing_id, buyer_id, seller_id, status,
                amount, currency, shipping_method, created_at, updated_at
            )
            VALUES (
                %s, %s, %s, %s, 'pending',
                %s, %s, %s::shipping_method_enum, %s, %s
            )
            RETURNING id, listing_id, buyer_id, seller_id, status
            """,
            (
                order_id,
                listing_id,
                buyer_id,
                seller_id,
                amount,
                currency,
                shipping_method,
                now,
                now,
            ),
        )
        row = dict(cur.fetchone())
    conn.commit()
    return row


def update_order_status(
    conn: psycopg2.extensions.connection,
    order_id: str,
    new_status: str,
) -> dict | None:
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE orders
            SET status = %s::order_status_enum, updated_at = %s
            WHERE id = %s AND deleted_at IS NULL
            RETURNING id, listing_id, buyer_id, seller_id, status
            """,
            (new_status, now, order_id),
        )
        row = cur.fetchone()
    if row:
        conn.commit()
        return dict(row)
    return None
