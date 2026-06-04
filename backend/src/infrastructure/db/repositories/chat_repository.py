from __future__ import annotations

import uuid
from datetime import datetime, timezone

import psycopg2.extensions

from domain.entities import ChatContext, ChatInboxItem, ChatMessage

_CHAT_STATUS_LABELS: dict[str, str] = {
    "active": "",
    "swapping": "交換中",
    "pending_payment": "待付款",
    "completed": "已完成",
    "archived": "已封存",
}

_ORDER_TO_CHAT_STATUS: dict[str, str] = {
    "pending_payment": "pending_payment",
    "paid": "active",
    "shipped": "active",
    "delivered": "active",
    "completed": "completed",
    "cancelled": "archived",
    "disputed": "active",
}

_ORDER_SYSTEM_MESSAGES: dict[str, str] = {
    "pending_payment": "訂單已建立，待付款",
    "paid": "買家已付款",
    "shipped": "賣家已出貨",
    "delivered": "商品已送達",
    "completed": "交易已完成",
    "cancelled": "訂單已取消",
    "disputed": "訂單進入爭議處理",
}


def _listing_trade_kind(
    trade_mode: str | None, allow_swap: bool | None, split_box_group_id: object
) -> str:
    tm = str(trade_mode or "")
    if allow_swap or tm == "swap":
        return "swap"
    if tm == "group_buy" or split_box_group_id:
        return "split"
    return "sell"


def _time_label(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = now - dt
    if diff.days == 0:
        return dt.strftime("%H:%M")
    if diff.days == 1:
        return "昨天"
    if diff.days < 7:
        return "週" + ["一", "二", "三", "四", "五", "六", "日"][dt.weekday()]
    return dt.strftime("%Y-%m-%d")


def _inbox_row_to_item(r: dict, user_id: str) -> ChatInboxItem:
    status = str(r.get("status") or "active")
    last_at = r.get("last_message_at")
    return ChatInboxItem(
        id=str(r["id"]),
        counterparty_name=r.get("counterparty_name") or "",
        last_message=r.get("last_message_preview") or "",
        last_message_at=str(last_at or ""),
        time_label=_time_label(last_at),
        status=status,
        status_label=_CHAT_STATUS_LABELS.get(status, ""),
        unread_count=int(r.get("unread_count") or 0),
        listing_image=r.get("listing_image") or "",
        listing_title=r.get("listing_title") or "",
        listing_trade_kind=_listing_trade_kind(
            r.get("listing_trade_mode"),
            r.get("listing_allow_swap"),
            r.get("split_box_group_id"),
        ),
        online=status == "swapping",
    )


_INBOX_SELECT = """
    SELECT
        c.id,
        c.status,
        c.last_message_preview,
        c.last_message_at,
        cp_me.unread_count,
        l.title AS listing_title,
        l.trade_mode AS listing_trade_mode,
        l.allow_swap AS listing_allow_swap,
        l.split_box_group_id,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.sort_order LIMIT 1
        ) AS listing_image,
        u_other.display_name AS counterparty_name
    FROM chat_participants cp_me
    JOIN chats c ON c.id = cp_me.chat_id
    JOIN chat_participants cp_other ON cp_other.chat_id = c.id
        AND cp_other.user_id != cp_me.user_id
    JOIN users u_other ON u_other.id = cp_other.user_id
    LEFT JOIN listings l ON l.id = c.listing_id
"""


def get_inbox(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[ChatInboxItem]:
    with conn.cursor() as cur:
        cur.execute(
            _INBOX_SELECT + " WHERE cp_me.user_id = %s ORDER BY c.last_message_at DESC NULLS LAST",
            (user_id,),
        )
        rows = cur.fetchall()
    return [_inbox_row_to_item(dict(row), user_id) for row in rows]


def get_inbox_item(
    conn: psycopg2.extensions.connection, user_id: str, chat_id: str
) -> ChatInboxItem | None:
    with conn.cursor() as cur:
        cur.execute(
            _INBOX_SELECT + " WHERE cp_me.user_id = %s AND c.id = %s LIMIT 1",
            (user_id, chat_id),
        )
        row = cur.fetchone()
    return _inbox_row_to_item(dict(row), user_id) if row else None


def is_participant(
    conn: psycopg2.extensions.connection, user_id: str, chat_id: str
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM chat_participants WHERE chat_id = %s AND user_id = %s",
            (chat_id, user_id),
        )
        return cur.fetchone() is not None


def get_listing_for_chat(
    conn: psycopg2.extensions.connection, listing_id: str
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, seller_id, status, price_amount, price_currency, shipping_method, shipping_methods
            FROM listings
            WHERE id = %s AND deleted_at IS NULL
            """,
            (listing_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def find_or_create_chat(
    conn: psycopg2.extensions.connection,
    listing_id: str,
    buyer_id: str,
    seller_id: str,
) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id FROM chats
            WHERE listing_id = %s AND buyer_id = %s AND seller_id = %s
            LIMIT 1
            """,
            (listing_id, buyer_id, seller_id),
        )
        row = cur.fetchone()
        if row:
            return str(row["id"])

        chat_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        cur.execute(
            """
            INSERT INTO chats (
                id, listing_id, buyer_id, seller_id, status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'active', %s, %s)
            """,
            (chat_id, listing_id, buyer_id, seller_id, now, now),
        )
        for uid in (buyer_id, seller_id):
            cur.execute(
                """
                INSERT INTO chat_participants (chat_id, user_id, unread_count)
                VALUES (%s, %s, 0)
                ON CONFLICT (chat_id, user_id) DO NOTHING
                """,
                (chat_id, uid),
            )
    conn.commit()
    return chat_id


def insert_text_message(
    conn: psycopg2.extensions.connection,
    chat_id: str,
    sender_id: str,
    content: str,
) -> ChatMessage:
    text = content.strip()
    if not text:
        raise ValueError("訊息不可為空")
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (id, chat_id, sender_id, type, content, created_at)
            VALUES (%s, %s, %s, 'text', %s, %s)
            RETURNING id, sender_id, type, content, created_at
            """,
            (msg_id, chat_id, sender_id, text, now),
        )
        row = dict(cur.fetchone())
        preview = text[:200]
        cur.execute(
            """
            UPDATE chats
            SET last_message_preview = %s, last_message_at = %s, updated_at = %s
            WHERE id = %s
            """,
            (preview, now, now, chat_id),
        )
        cur.execute(
            """
            UPDATE chat_participants
            SET unread_count = unread_count + 1
            WHERE chat_id = %s AND user_id != %s
            """,
            (chat_id, sender_id),
        )
    conn.commit()
    created = row.get("created_at")
    sender = str(row.get("sender_id") or "")
    return ChatMessage(
        id=str(row["id"]),
        sender_id=sender,
        is_mine=True,
        type=str(row.get("type") or "text"),
        content=row.get("content") or "",
        created_at=str(created or ""),
        time_label=_time_label(created),
    )


def mark_chat_read(
    conn: psycopg2.extensions.connection, user_id: str, chat_id: str
) -> None:
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE chat_participants
            SET unread_count = 0, last_read_at = %s
            WHERE chat_id = %s AND user_id = %s
            """,
            (now, chat_id, user_id),
        )
    conn.commit()


def link_order_to_chat(
    conn: psycopg2.extensions.connection,
    chat_id: str,
    order_id: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE chats SET order_id = %s, updated_at = %s WHERE id = %s",
            (order_id, datetime.now(timezone.utc), chat_id),
        )
    conn.commit()


def get_chat_by_order(
    conn: psycopg2.extensions.connection, order_id: str
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, listing_id, buyer_id, seller_id, order_id
            FROM chats WHERE order_id = %s LIMIT 1
            """,
            (order_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def apply_order_status_to_chat(
    conn: psycopg2.extensions.connection,
    *,
    listing_id: str,
    buyer_id: str,
    seller_id: str,
    order_id: str,
    order_status: str,
    actor_user_id: str,
) -> str | None:
    chat_status = _ORDER_TO_CHAT_STATUS.get(order_status, "active")
    system_text = _ORDER_SYSTEM_MESSAGES.get(order_status, "")
    chat_id = find_or_create_chat(conn, listing_id, buyer_id, seller_id)

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE chats
            SET order_id = %s,
                status = %s::chat_status_enum,
                updated_at = %s
            WHERE id = %s
            """,
            (order_id, chat_status, datetime.now(timezone.utc), chat_id),
        )
        if system_text:
            now = datetime.now(timezone.utc)
            msg_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO messages (id, chat_id, sender_id, type, content, created_at)
                VALUES (%s, %s, %s, 'system', %s, %s)
                """,
                (msg_id, chat_id, actor_user_id, system_text, now),
            )
            cur.execute(
                """
                UPDATE chats
                SET last_message_preview = %s, last_message_at = %s
                WHERE id = %s
                """,
                (system_text[:200], now, chat_id),
            )
            cur.execute(
                """
                UPDATE chat_participants
                SET unread_count = unread_count + 1
                WHERE chat_id = %s AND user_id != %s
                """,
                (chat_id, actor_user_id),
            )
    conn.commit()
    return chat_id


def get_messages(
    conn: psycopg2.extensions.connection,
    user_id: str,
    chat_id: str,
) -> list[ChatMessage]:
    if not is_participant(conn, user_id, chat_id):
        return []

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, sender_id, type, content, created_at
            FROM messages
            WHERE chat_id = %s AND is_deleted = false
            ORDER BY created_at ASC
            """,
            (chat_id,),
        )
        rows = cur.fetchall()

    msgs: list[ChatMessage] = []
    for row in rows:
        r = dict(row)
        sender = str(r.get("sender_id") or "")
        created = r.get("created_at")
        msg_type = str(r.get("type") or "text")
        msgs.append(
            ChatMessage(
                id=str(r["id"]),
                sender_id=sender,
                is_mine=sender == user_id and msg_type != "system",
                type=msg_type,
                content=r.get("content") or "",
                created_at=str(created or ""),
                time_label=_time_label(created),
            )
        )
    return msgs


def get_chat_context(
    conn: psycopg2.extensions.connection,
    user_id: str,
    chat_id: str,
) -> ChatContext | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                c.id,
                c.status,
                c.order_id,
                u_other.display_name AS counterparty_name,
                l.title AS listing_title,
                l.id AS listing_id,
                l.trade_mode AS listing_trade_mode,
                l.allow_swap AS listing_allow_swap,
                l.split_box_group_id,
                (
                    SELECT li.url FROM listing_images li
                    WHERE li.listing_id = l.id
                    ORDER BY li.sort_order LIMIT 1
                ) AS listing_image
            FROM chat_participants cp_me
            JOIN chats c ON c.id = cp_me.chat_id
            JOIN chat_participants cp_other ON cp_other.chat_id = c.id
                AND cp_other.user_id != cp_me.user_id
            JOIN users u_other ON u_other.id = cp_other.user_id
            LEFT JOIN listings l ON l.id = c.listing_id
            WHERE cp_me.user_id = %s AND c.id = %s
            LIMIT 1
            """,
            (user_id, chat_id),
        )
        row = cur.fetchone()
    if not row:
        return None
    r = dict(row)
    status = str(r.get("status") or "active")
    listing_id = r.get("listing_id")
    split_gid = r.get("split_box_group_id")
    return ChatContext(
        id=str(r["id"]),
        counterparty_name=r.get("counterparty_name") or "",
        listing_title=r.get("listing_title") or "",
        listing_id=str(listing_id) if listing_id else None,
        listing_image=r.get("listing_image") or "",
        listing_trade_kind=_listing_trade_kind(
            r.get("listing_trade_mode"),
            r.get("listing_allow_swap"),
            split_gid,
        ),
        split_box_group_id=str(split_gid) if split_gid else None,
        status=status,
        status_label=_CHAT_STATUS_LABELS.get(status, ""),
        order_id=str(r["order_id"]) if r.get("order_id") else None,
    )


# 保留舊名稱供過渡
def get_chat_header(
    conn: psycopg2.extensions.connection,
    user_id: str,
    chat_id: str,
) -> dict | None:
    ctx = get_chat_context(conn, user_id, chat_id)
    if not ctx:
        return None
    return ctx.model_dump()
