"""Redesign price_history to capture full KOCA order-history fields.

Changes:
  - Rename source_title → option_name  (option.name = variant sold)
  - Add shipping_fee    INT            (shippingFee)
  - Add packaging_fee   INT            (packagingFee)
  - Add total_amount    INT            (total = subtotal + fees)
  - Add listed_price    INT            (option.price = seller's ask)
  - Add order_status    TEXT           (raw KOCA status, preserved for auditing)
  - Add variant_alias   TEXT           (option.items[0].alias = exact item sold)

Revision ID: 0012_price_history_redesign
Revises: 0011_order_status_pending, 0005_add_price_history
"""

from __future__ import annotations

from alembic import op

revision = "0012_price_history_redesign"
down_revision = ("0011_order_status_pending", "0005_add_price_history")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE price_history
            RENAME COLUMN source_title TO option_name
        """
    )
    op.execute(
        """
        ALTER TABLE price_history
            ADD COLUMN IF NOT EXISTS shipping_fee   INT,
            ADD COLUMN IF NOT EXISTS packaging_fee  INT,
            ADD COLUMN IF NOT EXISTS total_amount   INT,
            ADD COLUMN IF NOT EXISTS listed_price   INT,
            ADD COLUMN IF NOT EXISTS order_status   TEXT,
            ADD COLUMN IF NOT EXISTS variant_alias  TEXT
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE price_history
            DROP COLUMN IF EXISTS variant_alias,
            DROP COLUMN IF EXISTS order_status,
            DROP COLUMN IF EXISTS listed_price,
            DROP COLUMN IF EXISTS total_amount,
            DROP COLUMN IF EXISTS packaging_fee,
            DROP COLUMN IF EXISTS shipping_fee
        """
    )
    op.execute(
        """
        ALTER TABLE price_history
            RENAME COLUMN option_name TO source_title
        """
    )
