from __future__ import annotations

from typing import Annotated, Literal

import psycopg2.extensions
from fastapi import APIRouter, Depends, Query

from api.dependencies import get_current_user_id, get_db
from application.collection_service import (
    add_to_collection,
    list_user_collections,
    remove_from_collection,
)
from domain.entities import AddCollectionItemRequest, UserCollections

router = APIRouter()


@router.get("", response_model=UserCollections)
def get_collections(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserCollections:
    return list_user_collections(conn, user_id)


@router.post("/items", response_model=UserCollections)
def add_collection(
    body: AddCollectionItemRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> UserCollections:
    return add_to_collection(conn, user_id, body.product_id, body.type)


@router.delete("/items/{product_id}", response_model=UserCollections)
def remove_collection(
    product_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
    type: Annotated[Literal["collected", "wishlist"], Query()] = "collected",
) -> UserCollections:
    return remove_from_collection(conn, user_id, product_id, type)
