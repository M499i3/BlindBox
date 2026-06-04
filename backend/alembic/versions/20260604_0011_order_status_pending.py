"""Use order status `pending` (待出貨); retire paid and pending_payment on orders.

Revision ID: 0011_order_status_pending
Revises: 0010_price_amount_major_units
"""

from __future__ import annotations

from alembic import op

revision = "0011_order_status_pending"
down_revision = "0010_price_amount_major_units"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL: ADD VALUE must commit before the new label can be used in UPDATE.
    with op.get_context().autocommit_block():
        op.execute(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'pending'
              ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'pending';
              END IF;
            END
            $$;
            """
        )

    op.execute(
        """
        UPDATE orders
        SET status = 'pending'::order_status_enum
        WHERE status::text IN ('paid', 'pending_payment');
        """
    )
    op.execute(
        """
        UPDATE chats
        SET status = 'active'::chat_status_enum
        WHERE status::text = 'pending_payment'
          AND order_id IS NOT NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE orders
        ALTER COLUMN status SET DEFAULT 'pending'::order_status_enum;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET status = 'paid'::order_status_enum
        WHERE status::text = 'pending';
        """
    )
    op.execute(
        """
        ALTER TABLE orders
        ALTER COLUMN status SET DEFAULT 'paid'::order_status_enum;
        """
    )
