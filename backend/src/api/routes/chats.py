from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user_id, get_db
from application.chat_service import (
    get_chat,
    list_chat_messages,
    list_chats,
    mark_read,
    open_chat_for_listing,
    send_message,
)
from domain.entities import (
    ChatContext,
    ChatInboxItem,
    ChatMessage,
    CreateChatRequest,
    SendMessageRequest,
)

router = APIRouter()


@router.get("", response_model=list[ChatInboxItem])
def get_chats(
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[ChatInboxItem]:
    return list_chats(conn, user_id)


@router.post("", response_model=ChatInboxItem, status_code=201)
def create_chat(
    body: CreateChatRequest,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> ChatInboxItem:
    return open_chat_for_listing(conn, user_id, body.listing_id)


@router.get("/{chat_id}", response_model=ChatContext)
def get_chat_by_id(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> ChatContext:
    return get_chat(conn, user_id, chat_id)


@router.get("/{chat_id}/messages", response_model=list[ChatMessage])
def get_chat_messages(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[ChatMessage]:
    return list_chat_messages(conn, user_id, chat_id)


@router.post("/{chat_id}/messages", response_model=ChatMessage, status_code=201)
def post_chat_message(
    chat_id: str,
    body: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> ChatMessage:
    return send_message(conn, user_id, chat_id, body.content)


@router.post("/{chat_id}/read", status_code=204)
def post_chat_read(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> None:
    mark_read(conn, user_id, chat_id)
