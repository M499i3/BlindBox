from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.auth_service import get_current_user, login
from domain.entities import AuthUser, LoginRequest, LoginResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login_route(
    body: LoginRequest,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> LoginResponse:
    return login(conn, body.email, body.password)


@router.get("/me", response_model=AuthUser)
def me_route(
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> AuthUser:
    return get_current_user(conn, user_id)
