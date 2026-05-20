from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.profile_service import get_user_profile, update_user_profile
from domain.entities import UpdateProfileInput, UserProfile

router = APIRouter()


@router.get("/me", response_model=UserProfile)
def get_my_profile(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserProfile:
    return get_user_profile(conn, user_id)


@router.put("/me", response_model=UserProfile)
def update_my_profile(
    data: UpdateProfileInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserProfile:
    return update_user_profile(conn, user_id, data)
