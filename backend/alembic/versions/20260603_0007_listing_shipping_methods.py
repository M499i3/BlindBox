"""Add listings.shipping_methods array for multi-select seller shipping.

Revision ID: 0007_listing_shipping_methods
Revises: 0006_split_box_groups
"""

from __future__ import annotations

from alembic import op

revision = "0007_listing_shipping_methods"
down_revision = "0006_split_box_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS shipping_methods shipping_method_enum[]
        NOT NULL DEFAULT ARRAY['711_store']::shipping_method_enum[];
        """
    )
    op.execute(
        """
        UPDATE listings
        SET shipping_methods = ARRAY[shipping_method]::shipping_method_enum[]
        WHERE cardinality(shipping_methods) = 0
           OR shipping_methods IS NULL;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE listings DROP COLUMN IF EXISTS shipping_methods;")
