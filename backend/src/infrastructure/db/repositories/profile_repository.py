from __future__ import annotations
from psycopg2.extras import RealDictCursor

import psycopg2.extensions

from domain.entities import UpdateProfileInput, UserProfile


def get_profile(
    conn: psycopg2.extensions.connection, user_id: str
) -> UserProfile | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id, display_name, avatar_url, bio FROM users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return UserProfile(
    id=row["id"],
    display_name=row["display_name"] or "",
    avatar_url=row.get("avatar_url"),
    bio=row.get("bio") or "",
    )


def update_profile(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: UpdateProfileInput,
) -> UserProfile:
    fields: list[str] = []
    values: list[object] = []

    if data.display_name is not None:
        fields.append("display_name = %s")
        values.append(data.display_name)
    if data.bio is not None:
        fields.append("bio = %s")
        values.append(data.bio)
    if data.avatar_url is not None:
        if data.avatar_url.startswith(("http://", "https://")):
            fields.append("avatar_url = %s")
            values.append(data.avatar_url)

    if fields:
        values.append(user_id)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE users SET {', '.join(fields)} WHERE id = %s",
                tuple(values),
            )
        conn.commit()

    profile = get_profile(conn, user_id)
    if profile is None:
        return UserProfile(
            id=user_id,
            display_name="",
            avatar_url=None,
            bio="",
        )

    return profile
