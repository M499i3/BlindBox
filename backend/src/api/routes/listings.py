from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user_id, get_db
from application.listing_service import (
    edit_listing,
    get_listing,
    list_active_listings,
    list_my_listings,
    new_listing,
    remove_listing,
)
from domain.entities import CreateListingInput, Listing

router = APIRouter()


@router.get("", response_model=list[Listing])
def get_listings(
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[Listing]:
    return list_active_listings(conn)


@router.get("/mine", response_model=list[Listing])
def get_my_listings(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[Listing]:
    return list_my_listings(conn, user_id)


@router.get("/{listing_id}", response_model=Listing)
def get_listing_by_id(
    listing_id: str,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> Listing:
    listing = get_listing(conn, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail=f"找不到貼文：{listing_id}")
    return listing


@router.post("", response_model=Listing, status_code=201)
def create_listing(
    data: CreateListingInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> Listing:
    return new_listing(conn, user_id, data)


@router.patch("/{listing_id}", response_model=Listing)
def update_listing_by_id(
    listing_id: str,
    data: CreateListingInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> Listing:
    listing = edit_listing(conn, listing_id, user_id, data)
    if not listing:
        raise HTTPException(status_code=404, detail="找不到貼文或無權限編輯")
    return listing


@router.delete("/{listing_id}", status_code=204)
def delete_listing_by_id(
    listing_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> None:
    try:
        remove_listing(conn, listing_id, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
