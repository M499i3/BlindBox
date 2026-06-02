from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import CreateSwapProposalInput, SwapProposal
from infrastructure.db.repositories.chat_repository import find_or_create_chat
from infrastructure.db.repositories.listing_repository import (
    create_listing,
    get_listing_by_id,
)
from infrastructure.db.repositories.swap_proposal_repository import (
    create_notification,
    create_swap_proposal,
    get_accepted_proposal_for_user,
    get_latest_proposal_for_user,
    get_pending_proposal_for_user,
    get_proposal_by_id,
    insert_swap_proposal_message,
    list_proposals_for_listing,
    update_proposal_status,
)


def _is_swap_listing(listing) -> bool:
    trade_mode = str(getattr(listing, "trade_mode", "") or "")
    allow_swap = bool(getattr(listing, "allow_swap", False))
    return allow_swap or trade_mode in ("swap", "我想換") or "換" in trade_mode


def submit_swap_proposal(
    conn: psycopg2.extensions.connection,
    user_id: str,
    data: CreateSwapProposalInput,
) -> SwapProposal:
    wanted = get_listing_by_id(conn, data.wanted_listing_id)
    if not wanted:
        raise HTTPException(status_code=404, detail="找不到目標貼文")
    if not _is_swap_listing(wanted):
        raise HTTPException(status_code=400, detail="此貼文不是交換類型")
    if wanted.seller_id == user_id:
        raise HTTPException(status_code=400, detail="無法對自己的貼文提出交換")

    if get_pending_proposal_for_user(conn, user_id, data.wanted_listing_id):
        raise HTTPException(status_code=409, detail="已有審核中的交換申請")

    if data.offered_listing_id:
        offered = get_listing_by_id(conn, data.offered_listing_id)
        if not offered:
            raise HTTPException(status_code=404, detail="找不到提供的商品")
        if offered.seller_id != user_id:
            raise HTTPException(status_code=403, detail="只能使用自己的上架商品")
        offered_listing_id = data.offered_listing_id
    elif data.offer:
        offer_input = data.offer.model_copy(
            update={
                "trade_mode": "我想換",
                "allow_swap": True,
                "price": data.offer.price or "NT$ 0",
            }
        )
        created = create_listing(conn, user_id, offer_input)
        offered_listing_id = created.id
    else:
        raise HTTPException(status_code=400, detail="請提供交換商品")

    chat_id = find_or_create_chat(
        conn,
        data.wanted_listing_id,
        user_id,
        wanted.seller_id,
    )

    proposal = create_swap_proposal(
        conn,
        chat_id=chat_id,
        proposer_id=user_id,
        receiver_id=wanted.seller_id,
        wanted_listing_id=data.wanted_listing_id,
        offered_listing_id=offered_listing_id,
        message=data.message,
        additional_amount=max(0, int(data.additional_amount or 0)),
    )

    create_notification(
        conn,
        user_id=wanted.seller_id,
        ntype="trade",
        title="新的交換申請",
        body=f"{proposal.proposer_name} 對你的貼文提出交換申請。",
        action_url=f"/listing/{data.wanted_listing_id}",
    )
    return proposal


def get_my_proposal_for_listing(
    conn: psycopg2.extensions.connection,
    user_id: str,
    listing_id: str,
) -> SwapProposal | None:
    return get_latest_proposal_for_user(conn, user_id, listing_id)


def get_incoming_proposals(
    conn: psycopg2.extensions.connection,
    user_id: str,
    listing_id: str,
) -> list[SwapProposal]:
    listing = get_listing_by_id(conn, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="找不到貼文")
    if listing.seller_id != user_id:
        raise HTTPException(status_code=403, detail="僅賣家可查看交換申請")
    return list_proposals_for_listing(conn, listing_id, user_id)


def accept_swap_proposal(
    conn: psycopg2.extensions.connection,
    user_id: str,
    proposal_id: str,
) -> SwapProposal:
    proposal = get_proposal_by_id(conn, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="找不到交換申請")
    if proposal.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="僅賣家可接受申請")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="此申請已處理")

    updated = update_proposal_status(conn, proposal_id, "accepted")
    assert updated is not None
    assert updated.chat_id

    preview = f"交換申請已通過：{updated.offered_listing.title}"
    insert_swap_proposal_message(
        conn,
        updated.chat_id,
        user_id,
        proposal_id,
        preview,
    )

    create_notification(
        conn,
        user_id=updated.proposer_id,
        ntype="trade",
        title="交換申請已通過",
        body="賣家已接受你的交換申請，現在可以聯絡對方。",
        action_url=f"/listing/{updated.wanted_listing_id}",
    )
    return updated


def reject_swap_proposal(
    conn: psycopg2.extensions.connection,
    user_id: str,
    proposal_id: str,
) -> SwapProposal:
    proposal = get_proposal_by_id(conn, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="找不到交換申請")
    if proposal.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="僅賣家可拒絕申請")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="此申請已處理")

    updated = update_proposal_status(conn, proposal_id, "rejected")
    assert updated is not None

    create_notification(
        conn,
        user_id=updated.proposer_id,
        ntype="trade",
        title="交換申請未通過",
        body="賣家已拒絕你的交換申請，你可以重新提交。",
        action_url=f"/listing/{updated.wanted_listing_id}",
    )
    return updated


def cancel_swap_proposal(
    conn: psycopg2.extensions.connection,
    user_id: str,
    proposal_id: str,
) -> SwapProposal:
    proposal = get_proposal_by_id(conn, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="找不到交換申請")
    if proposal.proposer_id != user_id:
        raise HTTPException(status_code=403, detail="僅申請人可撤回")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="此申請已處理")

    updated = update_proposal_status(conn, proposal_id, "cancelled")
    assert updated is not None
    return updated


def can_contact_for_swap_listing(
    conn: psycopg2.extensions.connection,
    user_id: str,
    listing_id: str,
) -> bool:
    listing = get_listing_by_id(conn, listing_id)
    if not listing:
        return False
    if not _is_swap_listing(listing):
        return True
    if listing.seller_id == user_id:
        return False
    accepted = get_accepted_proposal_for_user(conn, user_id, listing_id)
    return accepted is not None
