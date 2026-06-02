from __future__ import annotations
from psycopg2.extras import RealDictCursor

import psycopg2.extensions

from domain.entities import UpdateProfileInput, UserProfile


def get_profile(
    conn: psycopg2.extensions.connection, user_id: str
) -> UserProfile | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, display_id, display_name, avatar_url, bio,
                   rating_avg, rating_count, transaction_count
            FROM users WHERE id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return UserProfile(
        id=str(row["id"]),
        display_id=str(row.get("display_id") or ""),
        display_name=row["display_name"] or "",
        avatar_url=row.get("avatar_url"),
        bio=row.get("bio") or "",
        rating_avg=float(row.get("rating_avg") or 0),
        rating_count=int(row.get("rating_count") or 0),
        transaction_count=int(row.get("transaction_count") or 0),
    )


def update_profile(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: UpdateProfileInput,
) -> UserProfile:
    fields: list[str] = []
    values: list[object] = []
    provided = getattr(data, "model_fields_set", set())

    if "display_name" in provided and data.display_name is not None:
        fields.append("display_name = %s")
        values.append(data.display_name)
    if "bio" in provided and data.bio is not None:
        fields.append("bio = %s")
        values.append(data.bio)
    if "avatar_url" in provided:
        if data.avatar_url is None:
            fields.append("avatar_url = NULL")
        elif data.avatar_url.startswith(("http://", "https://")):
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
            display_id="",
            display_name="",
            avatar_url=None,
            bio="",
        )

    return profile
