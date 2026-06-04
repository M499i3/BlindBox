"""Remove catalog + marketplace data while keeping users."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg2.extensions import cursor


MARKETPLACE_ONLY_TABLES = [
    "message_reads",
    "messages",
    "swap_proposals",
    "chat_participants",
    "chats",
    "notifications",
    "user_ratings",
    "user_collections",
    "cart_items",
    "orders",
    "group_buy_members",
    "group_buys",
    "split_box_slots",
    "split_box_groups",
    "listing_images",
    "listings",
]


def purge_marketplace_only(cur: "cursor") -> None:
    """清除市集／社交資料，保留 users 與圖鑑（brands / series / catalog_products）。"""
    seen: set[str] = set()
    for table in MARKETPLACE_ONLY_TABLES:
        if table in seen:
            continue
        seen.add(table)
        cur.execute(f"DELETE FROM {table}")
    print(
        "🗑️  已清除市集與社交資料（listings、orders、chats、collections 等）；"
        "users 與圖鑑保留"
    )


def purge_catalog_and_marketplace(cur: "cursor") -> None:
    """Delete listings, orders, chats, catalog, etc. Users table is untouched."""
    tables_in_order = [
        "message_reads",
        "messages",
        "chat_participants",
        "chats",
        "swap_proposals",
        "user_ratings",
        "orders",
        "cart_items",
        "listing_images",
        "split_box_slots",
        "split_box_groups",
        "listings",
        "group_buy_members",
        "group_buys",
        "user_collections",
        "notifications",
        "catalog_products",
        "series",
        "brands",
    ]
    for table in tables_in_order:
        cur.execute(f"DELETE FROM {table}")
    print(
        "🗑️  已清除 catalog（brands / series / catalog_products）"
        "與市集相關資料（listings、orders、chats 等）；users 保留"
    )
