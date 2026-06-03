from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import OrderCreated, OrderSummary
from infrastructure.db.repositories.chat_repository import (
    apply_order_status_to_chat,
    get_listing_for_chat,
)
from infrastructure.db.repositories.order_repository import (
    _STATUS_LABELS,
    create_order,
    get_order_by_id,
    get_orders_for_user,
    update_order_status,
)

_BUYER_TRANSITIONS: dict[str, set[str]] = {
    "pending_payment": {"paid", "cancelled"},
}

_SELLER_TRANSITIONS: dict[str, set[str]] = {
    "paid": {"shipped", "cancelled"},
    "shipped": {"delivered", "completed"},
    "delivered": {"completed"},
}


def list_my_orders(
    conn: psycopg2.extensions.connection,
    user_id: str,
    role: str,
) -> list[OrderSummary]:
    if role not in ("buyer", "seller"):
        role = "buyer"
    return get_orders_for_user(conn, user_id, role=role)


def _can_transition(
    current: str, new: str, user_id: str, buyer_id: str, seller_id: str
) -> bool:
    if user_id == buyer_id:
        return new in _BUYER_TRANSITIONS.get(current, set())
    if user_id == seller_id:
        return new in _SELLER_TRANSITIONS.get(current, set())
    return False


def place_order(
    conn: psycopg2.extensions.connection,
    user_id: str,
    listing_id: str,
    *,
    shipping_ui: str | None = None,
) -> OrderCreated:
    listing = get_listing_for_chat(conn, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="找不到貼文")
    if str(listing.get("status")) != "active":
        raise HTTPException(status_code=400, detail="此貼文目前無法下單")
    seller_id = str(listing["seller_id"])
    if user_id == seller_id:
        raise HTTPException(status_code=403, detail="無法購買自己的貼文")

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE listings
            SET quantity = quantity - 1,
                status = CASE
                    WHEN quantity - 1 <= 0 THEN 'sold'::listing_status_enum
                    ELSE status
                END
            WHERE id = %s
            AND status = 'active'
            AND deleted_at IS NULL
            AND quantity > 0
            RETURNING quantity
            """,
            (listing_id,),
        )
        stock_row = cur.fetchone()

    if not stock_row:
        raise HTTPException(status_code=400, detail="商品已售完，無法下單")

    from infrastructure.db.repositories.listing_repository import (
        _SHIPPING_MAP,
        _SHIPPING_UI,
        _parse_shipping_methods_raw,
    )

    raw_methods = _parse_shipping_methods_raw(listing.get("shipping_methods"))
    allowed_ui = [_SHIPPING_UI.get(str(m), str(m)) for m in raw_methods if m]
    if not allowed_ui:
        allowed_ui = [_SHIPPING_UI.get(str(listing["shipping_method"]), "7-11 店到店")]

    if len(allowed_ui) > 1:
        if not shipping_ui or shipping_ui not in allowed_ui:
            raise HTTPException(
                status_code=400,
                detail=f"請選擇出貨方式：{', '.join(allowed_ui)}",
            )
        chosen_ui = shipping_ui
    else:
        chosen_ui = allowed_ui[0]

    shipping_db = _SHIPPING_MAP.get(chosen_ui, str(listing["shipping_method"]))

    order = create_order(
        conn,
        listing_id=listing_id,
        buyer_id=user_id,
        seller_id=seller_id,
        amount=int(listing["price_amount"]),
        currency=str(listing["price_currency"]),
        shipping_method=shipping_db,
    )
    status = str(order["status"])
    chat_id = apply_order_status_to_chat(
        conn,
        listing_id=listing_id,
        buyer_id=user_id,
        seller_id=seller_id,
        order_id=str(order["id"]),
        order_status=status,
        actor_user_id=user_id,
    )
    return OrderCreated(
        id=str(order["id"]),
        listing_id=listing_id,
        chat_id=chat_id,
        status=status,
        status_label=_STATUS_LABELS.get(status, status),
    )


def change_order_status(
    conn: psycopg2.extensions.connection,
    user_id: str,
    order_id: str,
    new_status: str,
) -> OrderCreated:
    order = get_order_by_id(conn, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
    buyer_id = str(order["buyer_id"])
    seller_id = str(order["seller_id"])
    if user_id not in (buyer_id, seller_id):
        raise HTTPException(status_code=403, detail="無權限更新此訂單")

    current = str(order["status"])
    if new_status == current:
        raise HTTPException(status_code=400, detail="訂單已是此狀態")
    if not _can_transition(current, new_status, user_id, buyer_id, seller_id):
        raise HTTPException(
            status_code=400,
            detail=f"無法從 {current} 變更為 {new_status}",
        )

    updated = update_order_status(conn, order_id, new_status)
    if not updated:
        raise HTTPException(status_code=404, detail="找不到訂單")

    status = str(updated["status"])
    chat_id = apply_order_status_to_chat(
        conn,
        listing_id=str(updated["listing_id"]),
        buyer_id=buyer_id,
        seller_id=seller_id,
        order_id=order_id,
        order_status=status,
        actor_user_id=user_id,
    )
    return OrderCreated(
        id=order_id,
        listing_id=str(updated["listing_id"]),
        chat_id=chat_id,
        status=status,
        status_label=_STATUS_LABELS.get(status, status),
    )
