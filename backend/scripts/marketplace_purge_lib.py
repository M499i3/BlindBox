"""Remove catalog + marketplace data while keeping users."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg2.extensions import cursor


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
