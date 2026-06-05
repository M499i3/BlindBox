from __future__ import annotations

import uuid
from datetime import datetime, timezone

import psycopg2.extensions

from domain.entities import RatingItem


def insert_rating(
    conn: psycopg2.extensions.connection,
    *,
    order_id: str,
    rater_id: str,
    ratee_id: str,
    score: int,
    comment: str | None,
) -> None:
    """Insert a rating row and update the ratee's denormalised rating_avg / rating_count."""
    rating_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_ratings (id, order_id, rater_id, ratee_id, score, comment, created_at)
            VALUES (%s, %s::uuid, %s::uuid, %s::uuid, %s, %s, %s)
            """,
            (rating_id, order_id, rater_id, ratee_id, score, comment, now),
        )
        # Update denormalised stats on users table
        cur.execute(
            """
            UPDATE users
            SET rating_count = rating_count + 1,
                rating_avg   = (rating_avg * rating_count + %s) / (rating_count + 1),
                updated_at   = %s
            WHERE id = %s::uuid
            """,
            (score, now, ratee_id),
        )
    conn.commit()


def has_rated_order(
    conn: psycopg2.extensions.connection,
    order_id: str,
    rater_id: str,
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM user_ratings WHERE order_id = %s::uuid AND rater_id = %s::uuid",
            (order_id, rater_id),
        )
        return cur.fetchone() is not None


def get_ratings_for_user(
    conn: psycopg2.extensions.connection,
    ratee_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[RatingItem]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                r.id,
                r.rater_id,
                u.display_name AS rater_name,
                r.score,
                r.comment,
                r.created_at
            FROM user_ratings r
            JOIN users u ON u.id = r.rater_id
            WHERE r.ratee_id = %s::uuid
            ORDER BY r.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (ratee_id, limit, offset),
        )
        rows = cur.fetchall()

    result: list[RatingItem] = []
    for row in rows:
        r = dict(row)
        result.append(
            RatingItem(
                id=str(r["id"]),
                rater_id=str(r["rater_id"]),
                rater_name=r.get("rater_name") or "",
                score=int(r["score"]),
                comment=r.get("comment"),
                created_at=str(r.get("created_at") or ""),
            )
        )
    return result
