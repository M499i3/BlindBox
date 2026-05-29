from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.notification_service import (
    list_notifications,
    mark_all_read,
    mark_read,
    remove_notification,
)
from domain.entities import NotificationItem

router = APIRouter()


@router.get("", response_model=list[NotificationItem])
def get_notifications_route(
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[NotificationItem]:
    return list_notifications(conn, user_id)


@router.patch("/read-all")
def mark_all_read_route(
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    count = mark_all_read(conn, user_id)
    return {"ok": True, "updated": count}


@router.patch("/{notification_id}/read")
def mark_read_route(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    mark_read(conn, user_id, notification_id)
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification_route(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    remove_notification(conn, user_id, notification_id)
    return {"ok": True}
