from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import UserCollections
from infrastructure.db.repositories.collection_repository import (
    add_collection_item,
    get_user_collection_ids,
    remove_collection_item,
)


def list_user_collections(
    conn: psycopg2.extensions.connection, user_id: str
) -> UserCollections:
    data = get_user_collection_ids(conn, user_id)
    return UserCollections(
        collected=data["collected"],
        wishlist=data["wishlist"],
    )


def add_to_collection(
    conn: psycopg2.extensions.connection,
    user_id: str,
    product_id: str,
    collection_type: str,
) -> UserCollections:
    if collection_type not in ("collected", "wishlist"):
        raise HTTPException(status_code=400, detail="type 必須為 collected 或 wishlist")
    try:
        add_collection_item(conn, user_id, product_id, collection_type)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return list_user_collections(conn, user_id)


def remove_from_collection(
    conn: psycopg2.extensions.connection,
    user_id: str,
    product_id: str,
    collection_type: str,
) -> UserCollections:
    if collection_type not in ("collected", "wishlist"):
        raise HTTPException(status_code=400, detail="type 必須為 collected 或 wishlist")
    remove_collection_item(conn, user_id, product_id, collection_type)
    return list_user_collections(conn, user_id)
