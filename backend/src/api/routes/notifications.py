from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.notification_service import list_notifications
from domain.entities import NotificationItem

router = APIRouter()


@router.get("", response_model=list[NotificationItem])
def get_notifications_route(
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[NotificationItem]:
    return list_notifications(conn, user_id)
