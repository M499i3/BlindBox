"""Mark split-box listings as sold when their slot is already claimed.

Revision ID: 0014_split_box_claimed_listing_sold
Revises: 0013_price_stats_in_metrics
"""

from __future__ import annotations

from alembic import op

revision = "0014_split_box_claimed_listing_sold"
down_revision = "0013_price_stats_in_metrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE listings l
        SET status = 'sold', updated_at = now()
        FROM split_box_slots ss
        WHERE l.split_box_slot_id = ss.id
          AND ss.status = 'claimed'
          AND l.status = 'active'
        """
    )


def downgrade() -> None:
    pass
