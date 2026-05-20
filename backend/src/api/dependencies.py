from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

import psycopg2
import psycopg2.extras
from fastapi import Header, HTTPException

from infrastructure.db.config import get_database_url


def get_current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """
    開發用：從 X-User-Id 請求標頭讀取使用者 UUID。
    未來換成 JWT 驗證時只需改此函式。
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="缺少 X-User-Id 標頭。請在 .env 設定 VITE_DEV_USER_ID 並由前端隨每個請求送出。",
        )
    return x_user_id


def get_db() -> Generator[psycopg2.extensions.connection, None, None]:
    """每個請求建立一個 psycopg2 連線，結束後關閉。"""
    conn = psycopg2.connect(
        get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    try:
        yield conn
    finally:
        conn.close()
