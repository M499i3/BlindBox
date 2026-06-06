from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import ClaimSplitBoxSlotInput, CreateSplitBoxInput, ShipSplitBoxInput, SplitBoxGroupDetail
from infrastructure.db.repositories.split_box_repository import (
    claim_split_box_slot,
    complete_split_box_group,
    create_split_box_group,
    get_split_box_group_detail,
    list_open_split_box_groups,
    list_split_box_groups_for_user,
    mark_split_box_shipped,
    receive_slot,
    ship_slot,
)


def create_group(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: CreateSplitBoxInput,
) -> SplitBoxGroupDetail:
    if not data.slots:
        raise HTTPException(status_code=400, detail="請至少選擇一個款式")
    try:
        return create_split_box_group(conn, user_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def get_group_detail(
    conn: psycopg2.extensions.connection,
    group_id: str,
    user_id: str,
) -> SplitBoxGroupDetail:
    detail = get_split_box_group_detail(conn, group_id, user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="找不到拆盒團")
    return detail


def list_groups(conn: psycopg2.extensions.connection) -> list:
    return list_open_split_box_groups(conn)


def list_my_organized(
    conn: psycopg2.extensions.connection,
    user_id: str,
) -> list:
    return list_split_box_groups_for_user(conn, user_id, role="organizer")


def list_my_joined(
    conn: psycopg2.extensions.connection,
    user_id: str,
) -> list:
    return list_split_box_groups_for_user(conn, user_id, role="participant")


def claim_slot(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
    data: ClaimSplitBoxSlotInput,
) -> SplitBoxGroupDetail:
    try:
        return claim_split_box_slot(conn, user_id, group_id, data.slot_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def ship_group(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
    data: ShipSplitBoxInput,
) -> SplitBoxGroupDetail:
    try:
        return mark_split_box_shipped(conn, user_id, group_id, data.shipping_note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def ship_single_slot(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
    slot_id: str,
) -> SplitBoxGroupDetail:
    try:
        return ship_slot(conn, user_id, group_id, slot_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def receive_single_slot(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
    slot_id: str,
) -> SplitBoxGroupDetail:
    try:
        return receive_slot(conn, user_id, group_id, slot_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def complete_group(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
) -> SplitBoxGroupDetail:
    try:
        return complete_split_box_group(conn, user_id, group_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
