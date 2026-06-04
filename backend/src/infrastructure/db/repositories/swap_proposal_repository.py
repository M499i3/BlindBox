from __future__ import annotations

import uuid
from datetime import datetime, timezone

import psycopg2.extensions

from domain.entities import SwapProposal, SwapProposalListingSummary


_PROPOSAL_SELECT = """
    SELECT
        sp.id,
        sp.chat_id,
        sp.proposer_id,
        sp.receiver_id,
        sp.wanted_listing_id,
        sp.offered_listing_id,
        sp.additional_amount,
        sp.message,
        sp.status,
        sp.created_at,
        u_proposer.display_name AS proposer_name,
        u_receiver.display_name AS receiver_name,
        wl.title AS wanted_title,
        wl.item_name AS wanted_item_name,
        wl.condition AS wanted_condition,
        wb.name AS wanted_brand,
        ws.name AS wanted_series,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = wl.id ORDER BY li.sort_order LIMIT 1
        ) AS wanted_image,
        ol.title AS offered_title,
        ol.item_name AS offered_item_name,
        ol.condition AS offered_condition,
        ob.name AS offered_brand,
        os.name AS offered_series,
        (
            SELECT li.url FROM listing_images li
            WHERE li.listing_id = ol.id ORDER BY li.sort_order LIMIT 1
        ) AS offered_image
    FROM swap_proposals sp
    JOIN users u_proposer ON u_proposer.id = sp.proposer_id
    JOIN users u_receiver ON u_receiver.id = sp.receiver_id
    JOIN listings wl ON wl.id = sp.wanted_listing_id
    LEFT JOIN brands wb ON wb.id = wl.brand_id
    LEFT JOIN series ws ON ws.id = wl.series_id
    JOIN listings ol ON ol.id = sp.offered_listing_id
    LEFT JOIN brands ob ON ob.id = ol.brand_id
    LEFT JOIN series os ON os.id = ol.series_id
"""

_CONDITION_UI = {
    "sealed": "全新未拆",
    "opened": "已拆盒",
    "displayed": "展示過",
}


def _listing_summary(
    listing_id: str,
    title: str | None,
    item_name: str | None,
    condition: str | None,
    brand: str | None,
    series: str | None,
    image: str | None,
) -> SwapProposalListingSummary:
    cond = _CONDITION_UI.get(str(condition or ""), str(condition or ""))
    return SwapProposalListingSummary(
        id=listing_id,
        title=title or "",
        item_name=item_name or "",
        image=image or "",
        condition=cond,
        brand=brand or "",
        series=series or "",
    )


def _row_to_proposal(row: dict) -> SwapProposal:
    wanted_id = str(row["wanted_listing_id"])
    offered_id = str(row["offered_listing_id"])
    chat_id = row.get("chat_id")
    return SwapProposal(
        id=str(row["id"]),
        chat_id=str(chat_id) if chat_id else None,
        proposer_id=str(row["proposer_id"]),
        proposer_name=row.get("proposer_name") or "",
        receiver_id=str(row["receiver_id"]),
        receiver_name=row.get("receiver_name") or "",
        wanted_listing_id=wanted_id,
        offered_listing_id=offered_id,
        wanted_listing=_listing_summary(
            wanted_id,
            row.get("wanted_title"),
            row.get("wanted_item_name"),
            row.get("wanted_condition"),
            row.get("wanted_brand"),
            row.get("wanted_series"),
            row.get("wanted_image"),
        ),
        offered_listing=_listing_summary(
            offered_id,
            row.get("offered_title"),
            row.get("offered_item_name"),
            row.get("offered_condition"),
            row.get("offered_brand"),
            row.get("offered_series"),
            row.get("offered_image"),
        ),
        additional_amount=int(row.get("additional_amount") or 0),
        message=row.get("message") or "",
        status=str(row.get("status") or "pending"),
        created_at=str(row.get("created_at") or ""),
    )


def get_pending_proposal_for_user(
    conn: psycopg2.extensions.connection,
    proposer_id: str,
    wanted_listing_id: str,
) -> SwapProposal | None:
    with conn.cursor() as cur:
        cur.execute(
            _PROPOSAL_SELECT
            + """
            WHERE sp.proposer_id = %s
              AND sp.wanted_listing_id = %s
              AND sp.status = 'pending'
            ORDER BY sp.created_at DESC
            LIMIT 1
            """,
            (proposer_id, wanted_listing_id),
        )
        row = cur.fetchone()
    return _row_to_proposal(dict(row)) if row else None


def get_accepted_proposal_for_user(
    conn: psycopg2.extensions.connection,
    proposer_id: str,
    wanted_listing_id: str,
) -> SwapProposal | None:
    with conn.cursor() as cur:
        cur.execute(
            _PROPOSAL_SELECT
            + """
            WHERE sp.proposer_id = %s
              AND sp.wanted_listing_id = %s
              AND sp.status = 'accepted'
            ORDER BY sp.resolved_at DESC NULLS LAST, sp.created_at DESC
            LIMIT 1
            """,
            (proposer_id, wanted_listing_id),
        )
        row = cur.fetchone()
    return _row_to_proposal(dict(row)) if row else None


def get_latest_proposal_for_user(
    conn: psycopg2.extensions.connection,
    proposer_id: str,
    wanted_listing_id: str,
) -> SwapProposal | None:
    with conn.cursor() as cur:
        cur.execute(
            _PROPOSAL_SELECT
            + """
            WHERE sp.proposer_id = %s AND sp.wanted_listing_id = %s
            ORDER BY sp.created_at DESC
            LIMIT 1
            """,
            (proposer_id, wanted_listing_id),
        )
        row = cur.fetchone()
    return _row_to_proposal(dict(row)) if row else None


def list_proposals_for_listing(
    conn: psycopg2.extensions.connection,
    listing_id: str,
    receiver_id: str,
) -> list[SwapProposal]:
    with conn.cursor() as cur:
        cur.execute(
            _PROPOSAL_SELECT
            + """
            WHERE sp.wanted_listing_id = %s AND sp.receiver_id = %s
            ORDER BY
              CASE sp.status WHEN 'pending' THEN 0 ELSE 1 END,
              sp.created_at DESC
            """,
            (listing_id, receiver_id),
        )
        rows = cur.fetchall()
    return [_row_to_proposal(dict(row)) for row in rows]


def get_proposal_by_id(
    conn: psycopg2.extensions.connection, proposal_id: str
) -> SwapProposal | None:
    with conn.cursor() as cur:
        cur.execute(_PROPOSAL_SELECT + " WHERE sp.id = %s LIMIT 1", (proposal_id,))
        row = cur.fetchone()
    return _row_to_proposal(dict(row)) if row else None


def create_swap_proposal(
    conn: psycopg2.extensions.connection,
    *,
    chat_id: str,
    proposer_id: str,
    receiver_id: str,
    wanted_listing_id: str,
    offered_listing_id: str,
    message: str | None,
    additional_amount: int,
) -> SwapProposal:
    proposal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO swap_proposals (
                id, chat_id, proposer_id, receiver_id,
                wanted_listing_id, offered_listing_id,
                additional_amount, message, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s)
            """,
            (
                proposal_id,
                chat_id,
                proposer_id,
                receiver_id,
                wanted_listing_id,
                offered_listing_id,
                additional_amount,
                message or "",
                now,
                now,
            ),
        )
    conn.commit()
    result = get_proposal_by_id(conn, proposal_id)
    assert result is not None
    create_notification(
        conn,
        user_id=receiver_id,
        ntype="trade",
        title="有人想和你交換",
        body=f"{result.proposer_name} 想用「{result.offered_listing.item_name or result.offered_listing.title}」交換你的「{result.wanted_listing.item_name or result.wanted_listing.title}」。",
        action_url=f"/swap-proposals/{wanted_listing_id}",
    )
    return result



def update_proposal_status(
    conn: psycopg2.extensions.connection,
    proposal_id: str,
    status: str,
) -> SwapProposal | None:
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE swap_proposals
            SET status = %s::swap_proposal_status_enum,
                updated_at = %s,
                resolved_at = %s
            WHERE id = %s
            """,
            (status, now, now, proposal_id),
        )
    conn.commit()
    return get_proposal_by_id(conn, proposal_id)


def insert_swap_proposal_message(
    conn: psycopg2.extensions.connection,
    chat_id: str,
    sender_id: str,
    proposal_id: str,
    preview: str,
) -> None:
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (id, chat_id, sender_id, type, content, swap_proposal_id, created_at)
            VALUES (%s, %s, %s, 'swap_proposal', %s, %s, %s)
            """,
            (msg_id, chat_id, sender_id, preview, proposal_id, now),
        )
        cur.execute(
            """
            UPDATE chats
            SET status = 'swapping'::chat_status_enum,
                last_message_preview = %s,
                last_message_at = %s,
                updated_at = %s
            WHERE id = %s
            """,
            (preview[:200], now, now, chat_id),
        )
        cur.execute(
            """
            UPDATE chat_participants
            SET unread_count = unread_count + 1
            WHERE chat_id = %s AND user_id != %s
            """,
            (chat_id, sender_id),
        )
    conn.commit()


def create_notification(
    conn: psycopg2.extensions.connection,
    *,
    user_id: str,
    ntype: str,
    title: str,
    body: str,
    action_url: str | None = None,
) -> None:
    notif_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (id, user_id, type, title, body, action_url)
            VALUES (%s, %s, %s::notification_type_enum, %s, %s, %s)
            """,
            (notif_id, user_id, ntype, title, body, action_url),
        )
    conn.commit()
