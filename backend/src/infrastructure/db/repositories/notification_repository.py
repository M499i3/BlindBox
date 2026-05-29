from __future__ import annotations

import psycopg2.extensions

from domain.entities import NotificationItem

_TYPE_LABELS: dict[str, str] = {
    "system": "系統通知",
    "activity": "活動快訊",
    "trade": "交易動態",
    "support": "客服消息",
}

_TYPE_ICONS: dict[str, str] = {
    "system": "settings",
    "activity": "campaign",
    "trade": "swap_horiz",
    "support": "support_agent",
}


def get_notifications(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[NotificationItem]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, type, title, body, is_read, created_at, action_url
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    items: list[NotificationItem] = []
    for row in rows:
        r = dict(row)
        ntype = str(r.get("type") or "system")
        items.append(
            NotificationItem(
                id=str(r["id"]),
                type=ntype,
                type_label=_TYPE_LABELS.get(ntype, ntype),
                title=r.get("title") or "",
                body=r.get("body") or "",
                is_read=bool(r.get("is_read")),
                created_at=str(r.get("created_at") or ""),
                action_url=r.get("action_url"),
            )
        )
    return items


def mark_notification_read(
    conn: psycopg2.extensions.connection, user_id: str, notification_id: str
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s AND user_id = %s
            """,
            (notification_id, user_id),
        )
        updated = cur.rowcount > 0
    conn.commit()
    return updated


def mark_all_notifications_read(
    conn: psycopg2.extensions.connection, user_id: str
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE
            """,
            (user_id,),
        )
        count = cur.rowcount
    conn.commit()
    return count


def delete_notification(
    conn: psycopg2.extensions.connection, user_id: str, notification_id: str
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM notifications
            WHERE id = %s AND user_id = %s
            """,
            (notification_id, user_id),
        )
        deleted = cur.rowcount > 0
    conn.commit()
    return deleted


def notification_icon(ntype: str) -> str:
    return _TYPE_ICONS.get(ntype, "notifications")
