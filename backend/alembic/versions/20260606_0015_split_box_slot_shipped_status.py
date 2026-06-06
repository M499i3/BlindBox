"""add shipped status to split_box_slots

Revision ID: 20260606_0015
Revises: 20260605_0014_split_box_claimed_listing_sold
Create Date: 2026-06-06
"""
from alembic import op

revision = "0015_slot_shipped"
down_revision = "0013_price_stats_in_metrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Replace CHECK constraint to include 'shipped'
    op.execute("ALTER TABLE split_box_slots DROP CONSTRAINT IF EXISTS split_box_slots_status_check")
    op.execute(
        "ALTER TABLE split_box_slots ADD CONSTRAINT split_box_slots_status_check "
        "CHECK (status IN ('reserved', 'available', 'claimed', 'shipped'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE split_box_slots DROP CONSTRAINT IF EXISTS split_box_slots_status_check")
    op.execute(
        "ALTER TABLE split_box_slots ADD CONSTRAINT split_box_slots_status_check "
        "CHECK (status IN ('reserved', 'available', 'claimed'))"
    )
