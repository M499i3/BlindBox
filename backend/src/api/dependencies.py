from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

import psycopg2
import psycopg2.extras
from fastapi import Header, HTTPException

from infrastructure.auth.jwt_tokens import decode_access_token
from infrastructure.db.config import get_database_url


def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """
    優先驗證 Authorization: Bearer <JWT>。
    保留 X-User-Id 僅供本機腳本或 Swagger 手動測試。
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        if token:
            return decode_access_token(token)
    if x_user_id:
        return x_user_id
    raise HTTPException(
        status_code=401,
        detail="請先登入",
        headers={"WWW-Authenticate": "Bearer"},
    )


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
