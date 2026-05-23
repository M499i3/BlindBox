from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import AuthUser, LoginResponse
from infrastructure.auth.jwt_tokens import create_access_token
from infrastructure.auth.password import verify_password
from infrastructure.db.repositories.user_repository import get_user_by_email, get_user_by_id


def login(
    conn: psycopg2.extensions.connection, email: str, password: str
) -> LoginResponse:
    user = get_user_by_email(conn, email)
    if not user:
        raise HTTPException(status_code=401, detail="電子郵件或密碼錯誤")
    if str(user.get("status") or "active") != "active":
        raise HTTPException(status_code=403, detail="此帳號已停用")
    if not verify_password(password, str(user["password_hash"])):
        raise HTTPException(status_code=401, detail="電子郵件或密碼錯誤")

    uid = str(user["id"])
    user_email = str(user.get("email") or email)
    display_name = str(user.get("display_name") or "")
    token = create_access_token(user_id=uid, email=user_email)
    return LoginResponse(
        access_token=token,
        user=AuthUser(id=uid, email=user_email, display_name=display_name),
    )


def get_current_user(
    conn: psycopg2.extensions.connection, user_id: str
) -> AuthUser:
    user = get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="找不到使用者")
    return AuthUser(
        id=str(user["id"]),
        email=str(user.get("email") or ""),
        display_name=str(user.get("display_name") or ""),
    )
