from __future__ import annotations

import psycopg2.extensions

from domain.entities import NotificationItem
from infrastructure.db.repositories.notification_repository import get_notifications


def list_notifications(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[NotificationItem]:
    return get_notifications(conn, user_id)
