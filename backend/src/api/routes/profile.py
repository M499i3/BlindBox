from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user_id, get_db
from application.order_service import list_user_ratings
from application.profile_service import get_user_profile, update_user_profile
from domain.entities import RatingItem, UpdateProfileInput, UserProfile
from infrastructure.db.repositories.profile_repository import get_profile

router = APIRouter()


@router.get("/me", response_model=UserProfile)
def get_my_profile(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserProfile:
    return get_user_profile(conn, user_id)


@router.get("/users/{target_user_id}", response_model=UserProfile)
def get_user_public_profile(
    target_user_id: str,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserProfile:
    profile = get_profile(conn, target_user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="找不到使用者")
    return profile


@router.put("/me", response_model=UserProfile)
def update_my_profile(
    data: UpdateProfileInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserProfile:
    return update_user_profile(conn, user_id, data)


@router.get("/users/{target_user_id}/ratings", response_model=list[RatingItem])
def get_user_ratings(
    target_user_id: str,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[RatingItem]:
    return list_user_ratings(conn, target_user_id)
