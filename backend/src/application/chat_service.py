from __future__ import annotations

import psycopg2.extensions
from fastapi import HTTPException

from domain.entities import ChatContext, ChatInboxItem, ChatMessage
from infrastructure.db.repositories.chat_repository import (
    find_or_create_chat,
    get_chat_context,
    get_inbox,
    get_inbox_item,
    get_listing_for_chat,
    get_messages,
    insert_text_message,
    is_participant,
    mark_chat_read,
)


def list_chats(
    conn: psycopg2.extensions.connection, user_id: str
) -> list[ChatInboxItem]:
    return get_inbox(conn, user_id)


def open_chat_for_listing(
    conn: psycopg2.extensions.connection,
    user_id: str,
    listing_id: str,
) -> ChatInboxItem:
    listing = get_listing_for_chat(conn, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="找不到貼文")
    if str(listing.get("status")) != "active":
        raise HTTPException(status_code=400, detail="此貼文目前無法開啟聊天")
    seller_id = str(listing["seller_id"])
    if user_id == seller_id:
        raise HTTPException(status_code=403, detail="無法與自己的貼文開啟聊天")
    chat_id = find_or_create_chat(conn, listing_id, user_id, seller_id)
    item = get_inbox_item(conn, user_id, chat_id)
    if not item:
        raise HTTPException(status_code=500, detail="建立聊天室失敗")
    return item


def get_chat(
    conn: psycopg2.extensions.connection, user_id: str, chat_id: str
) -> ChatContext:
    ctx = get_chat_context(conn, user_id, chat_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="找不到聊天室")
    return ctx


def list_chat_messages(
    conn: psycopg2.extensions.connection,
    user_id: str,
    chat_id: str,
) -> list[ChatMessage]:
    if not is_participant(conn, user_id, chat_id):
        raise HTTPException(status_code=404, detail="找不到聊天室")
    return get_messages(conn, user_id, chat_id)


def send_message(
    conn: psycopg2.extensions.connection,
    user_id: str,
    chat_id: str,
    content: str,
) -> ChatMessage:
    if not is_participant(conn, user_id, chat_id):
        raise HTTPException(status_code=404, detail="找不到聊天室")
    try:
        return insert_text_message(conn, chat_id, user_id, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


def mark_read(
    conn: psycopg2.extensions.connection, user_id: str, chat_id: str
) -> None:
    if not is_participant(conn, user_id, chat_id):
        raise HTTPException(status_code=404, detail="找不到聊天室")
    mark_chat_read(conn, user_id, chat_id)
