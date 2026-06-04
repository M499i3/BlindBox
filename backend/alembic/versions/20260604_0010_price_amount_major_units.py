"""Convert stored price amounts from cents to major currency units (元).

Revision ID: 0010_price_amount_major_units
Revises: 0009_ips_and_product_series

Applies to marketplace/listing-related INT price columns that were stored as
smallest currency units (e.g. 280 TWD → 28000). After this migration, values
are whole major units (280).
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import text

revision = "0010_price_amount_major_units"
down_revision = "0009_ips_and_product_series"
branch_labels = None
depends_on = None

# (table, column) pairs to convert
_PRICE_COLUMNS: list[tuple[str, str]] = [
    ("listings", "price_amount"),
    ("orders", "amount"),
    ("split_box_groups", "total_price_amount"),
    ("split_box_groups", "price_per_slot_amount"),
    ("split_box_slots", "price_amount"),
    ("catalog_products", "official_price_amount"),
    ("price_history", "price_amount"),
    ("group_buys", "price_per_slot_amount"),
    ("swap_proposals", "additional_amount"),
]


def _divide_column(conn, table: str, column: str) -> None:
    conn.execute(
        text(
            f"""
            UPDATE {table}
            SET {column} = {column} / 100
            WHERE {column} IS NOT NULL AND {column} <> 0
            """
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    for table, column in _PRICE_COLUMNS:
        _divide_column(bind, table, column)


def downgrade() -> None:
    bind = op.get_bind()
    for table, column in _PRICE_COLUMNS:
        bind.execute(
            text(
                f"""
                UPDATE {table}
                SET {column} = {column} * 100
                WHERE {column} IS NOT NULL AND {column} <> 0
                """
            )
        )
