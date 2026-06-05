from __future__ import annotations

import psycopg2.extensions

from domain.entities import Listing
from infrastructure.db.repositories.listing_repository import get_listing_by_id


def get_cart_listing_ids(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT listing_id FROM cart_items WHERE user_id = %s ORDER BY added_at",
            (user_id,),
        )
        rows = cur.fetchall()
    return [str(r["listing_id"]) for r in rows]


def get_cart_listings(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[Listing]:
    ids = get_cart_listing_ids(conn, user_id)
    listings = []
    for lid in ids:
        item = get_listing_by_id(conn, lid)
        if item and not item.split_box_slot_id:
            listings.append(item)
    return listings


def add_to_cart(
    conn: psycopg2.extensions.connection, user_id: str, listing_id: str
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT seller_id, split_box_slot_id
            FROM listings WHERE id = %s AND deleted_at IS NULL
            """,
            (listing_id,),
        )
        row = cur.fetchone()
        if not row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="找不到貼文")
        if row.get("split_box_slot_id"):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="拆盒款式請直接認領，無法加入購物車")
        if str(row["seller_id"]) == user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="無法將自己的貼文加入購物車")
        cur.execute(
            """
            INSERT INTO cart_items (user_id, listing_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, listing_id) DO NOTHING
            """,
            (user_id, listing_id),
        )
    conn.commit()


def remove_from_cart(
    conn: psycopg2.extensions.connection, user_id: str, listing_id: str
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM cart_items WHERE user_id = %s AND listing_id = %s",
            (user_id, listing_id),
        )
    conn.commit()
