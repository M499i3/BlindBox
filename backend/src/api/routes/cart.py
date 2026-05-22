from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.cart_service import add_item, get_cart, remove_item
from domain.entities import Listing

router = APIRouter()


@router.get("", response_model=list[Listing])
def list_cart(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[Listing]:
    return get_cart(conn, user_id)


@router.post("/items/{listing_id}", status_code=200)
def add_cart_item(
    listing_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    add_item(conn, user_id, listing_id)
    return {"ok": True}


@router.delete("/items/{listing_id}", status_code=200)
def remove_cart_item(
    listing_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    remove_item(conn, user_id, listing_id)
    return {"ok": True}
