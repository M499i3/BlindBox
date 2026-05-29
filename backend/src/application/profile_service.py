from __future__ import annotations

import psycopg2.extensions

from domain.entities import UpdateProfileInput, UserProfile
from infrastructure.db.repositories.profile_repository import (
    get_profile,
    update_profile,
)


def get_user_profile(
    conn: psycopg2.extensions.connection, user_id: str
) -> UserProfile:
    profile = get_profile(conn, user_id)
    return profile or UserProfile(
        id=user_id,
        display_id="",
        display_name="User",
        avatar_url=None,
        bio="",
    )


def update_user_profile(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: UpdateProfileInput,
) -> UserProfile:
    return update_profile(conn, user_id, data)
