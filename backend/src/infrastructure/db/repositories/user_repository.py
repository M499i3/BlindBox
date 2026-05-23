from __future__ import annotations

import psycopg2.extensions


def get_user_by_email(
    conn: psycopg2.extensions.connection, email: str
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, display_name, password_hash, status
            FROM users
            WHERE lower(email) = lower(%s)
            LIMIT 1
            """,
            (email.strip(),),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def get_user_by_id(
    conn: psycopg2.extensions.connection, user_id: str
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, display_name, avatar_url, bio
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None
