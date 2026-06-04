from __future__ import annotations

import psycopg2.extensions

from domain.entities import CreateListingInput, Listing
from infrastructure.db.repositories.listing_repository import (
    create_listing,
    get_active_listings,
    get_listing_by_id,
    get_my_listings,
    soft_delete_listing,
    update_listing,
)


def list_active_listings(conn: psycopg2.extensions.connection) -> list[Listing]:
    return get_active_listings(conn)


def list_my_listings(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[Listing]:
    return get_my_listings(conn, user_id)


def get_listing(
    conn: psycopg2.extensions.connection, listing_id: str
) -> Listing | None:
    return get_listing_by_id(conn, listing_id)


def new_listing(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: CreateListingInput,
) -> Listing:
    return create_listing(conn, user_id, data)


def edit_listing(
    conn: psycopg2.extensions.connection,
    listing_id: str,
    user_id: str,
    data: CreateListingInput,
) -> Listing | None:
    return update_listing(conn, listing_id, user_id, data)


def remove_listing(
    conn: psycopg2.extensions.connection, listing_id: str, user_id: str
) -> None:
    if not soft_delete_listing(conn, listing_id, user_id):
        raise LookupError("找不到貼文或無權限刪除")
