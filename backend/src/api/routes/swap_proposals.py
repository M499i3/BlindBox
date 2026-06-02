from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user_id, get_db
from application.swap_proposal_service import (
    accept_swap_proposal,
    cancel_swap_proposal,
    get_incoming_proposals,
    get_my_proposal_for_listing,
    reject_swap_proposal,
    submit_swap_proposal,
)
from domain.entities import CreateSwapProposalInput, SwapProposal

router = APIRouter()


@router.post("", response_model=SwapProposal, status_code=201)
def create_swap_proposal(
    data: CreateSwapProposalInput,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SwapProposal:
    return submit_swap_proposal(conn, user_id, data)


@router.get("/for-listing/{listing_id}/mine", response_model=SwapProposal | None)
def get_my_swap_proposal_for_listing(
    listing_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SwapProposal | None:
    return get_my_proposal_for_listing(conn, user_id, listing_id)


@router.get("/by-listing/{listing_id}", response_model=list[SwapProposal])
def list_swap_proposals_for_listing(
    listing_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[SwapProposal]:
    return get_incoming_proposals(conn, user_id, listing_id)


@router.post("/{proposal_id}/accept", response_model=SwapProposal)
def accept_proposal(
    proposal_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SwapProposal:
    return accept_swap_proposal(conn, user_id, proposal_id)


@router.post("/{proposal_id}/reject", response_model=SwapProposal)
def reject_proposal(
    proposal_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SwapProposal:
    return reject_swap_proposal(conn, user_id, proposal_id)


@router.post("/{proposal_id}/cancel", response_model=SwapProposal)
def cancel_proposal(
    proposal_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SwapProposal:
    return cancel_swap_proposal(conn, user_id, proposal_id)
