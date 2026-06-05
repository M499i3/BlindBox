from __future__ import annotations

from typing import Annotated, Literal

import psycopg2.extensions
from fastapi import APIRouter, Depends, Query

from api.dependencies import get_current_user_id, get_db
from application.order_service import (
    change_order_status,
    list_my_orders,
    place_order,
    submit_order_rating,
)
from domain.entities import (
    CreateOrderRequest,
    OrderCreated,
    OrderSummary,
    SubmitRatingRequest,
    UpdateOrderStatusRequest,
)

router = APIRouter()


@router.get("/mine", response_model=list[OrderSummary])
def get_my_orders(
    role: Annotated[Literal["buyer", "seller"], Query()] = "buyer",
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[OrderSummary]:
    return list_my_orders(conn, user_id, role)


@router.post("", response_model=OrderCreated, status_code=201)
def create_order_route(
    body: CreateOrderRequest,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> OrderCreated:
    return place_order(conn, user_id, body.listing_id, shipping_ui=body.shipping)


@router.patch("/{order_id}/status", response_model=OrderCreated)
def patch_order_status(
    order_id: str,
    body: UpdateOrderStatusRequest,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> OrderCreated:
    return change_order_status(conn, user_id, order_id, body.status)


@router.post("/{order_id}/rating", status_code=204)
def post_order_rating(
    order_id: str,
    body: SubmitRatingRequest,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> None:
    submit_order_rating(conn, user_id, order_id, body)