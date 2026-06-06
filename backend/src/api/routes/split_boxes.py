from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.split_box_service import (
    claim_slot,
    complete_group,
    create_group,
    get_group_detail,
    list_groups,
    list_my_joined,
    list_my_organized,
    receive_single_slot,
    ship_group,
    ship_single_slot,
)
from domain.entities import (
    ClaimSplitBoxSlotInput,
    CreateSplitBoxInput,
    ShipSplitBoxInput,
    SplitBoxGroupDetail,
    SplitBoxGroupSummary,
)

router = APIRouter()


@router.post("", response_model=SplitBoxGroupDetail, status_code=201)
def create_split_box(
    data: CreateSplitBoxInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return create_group(conn, user_id, data)


@router.get("", response_model=list[SplitBoxGroupSummary])
def list_split_boxes(
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[SplitBoxGroupSummary]:
    return list_groups(conn)


@router.get("/mine/organized", response_model=list[SplitBoxGroupSummary])
def list_my_organized_groups(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[SplitBoxGroupSummary]:
    return list_my_organized(conn, user_id)


@router.get("/mine/joined", response_model=list[SplitBoxGroupSummary])
def list_my_joined_groups(
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[SplitBoxGroupSummary]:
    return list_my_joined(conn, user_id)


@router.get("/{group_id}", response_model=SplitBoxGroupDetail)
def get_split_box(
    group_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return get_group_detail(conn, group_id, user_id)


@router.post("/{group_id}/claim", response_model=SplitBoxGroupDetail)
def claim_split_box_slot_route(
    group_id: str,
    data: ClaimSplitBoxSlotInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return claim_slot(conn, user_id, group_id, data)


@router.post("/{group_id}/ship", response_model=SplitBoxGroupDetail)
def ship_split_box(
    group_id: str,
    data: ShipSplitBoxInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return ship_group(conn, user_id, group_id, data)


@router.post("/{group_id}/slots/{slot_id}/ship", response_model=SplitBoxGroupDetail)
def ship_split_box_slot(
    group_id: str,
    slot_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return ship_single_slot(conn, user_id, group_id, slot_id)


@router.post("/{group_id}/slots/{slot_id}/receive", response_model=SplitBoxGroupDetail)
def receive_split_box_slot(
    group_id: str,
    slot_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return receive_single_slot(conn, user_id, group_id, slot_id)


@router.post("/{group_id}/complete", response_model=SplitBoxGroupDetail)
def complete_split_box(
    group_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SplitBoxGroupDetail:
    return complete_group(conn, user_id, group_id)
