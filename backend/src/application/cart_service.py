from __future__ import annotations

import psycopg2.extensions

from domain.entities import Listing
from infrastructure.db.repositories.cart_repository import (
    add_to_cart,
    get_cart_listings,
    remove_from_cart,
)


def get_cart(conn: psycopg2.extensions.connection, user_id: str) -> list[Listing]:
    return get_cart_listings(conn, user_id)


def add_item(
    conn: psycopg2.extensions.connection, user_id: str, listing_id: str
) -> None:
    add_to_cart(conn, user_id, listing_id)


def remove_item(
    conn: psycopg2.extensions.connection, user_id: str, listing_id: str
) -> None:
    remove_from_cart(conn, user_id, listing_id)
