from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import NotificationItem
from infrastructure.db.repositories.notification_repository import (
    delete_notification,
    get_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)


def list_notifications(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[NotificationItem]:
    return get_notifications(conn, user_id)


def mark_read(
    conn: psycopg2.extensions.connection, user_id: str, notification_id: str
) -> None:
    if not mark_notification_read(conn, user_id, notification_id):
        raise HTTPException(status_code=404, detail="找不到通知")


def mark_all_read(conn: psycopg2.extensions.connection, user_id: str) -> int:
    return mark_all_notifications_read(conn, user_id)


def remove_notification(
    conn: psycopg2.extensions.connection, user_id: str, notification_id: str
) -> None:
    if not delete_notification(conn, user_id, notification_id):
        raise HTTPException(status_code=404, detail="找不到通知")
