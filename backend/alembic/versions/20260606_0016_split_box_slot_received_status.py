"""add received status to split_box_slots

Revision ID: 0016_slot_received
Revises: 0015_slot_shipped
Create Date: 2026-06-06
"""
from alembic import op

revision = "0016_slot_received"
down_revision = "0015_slot_shipped"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE split_box_slots DROP CONSTRAINT IF EXISTS split_box_slots_status_check")
    op.execute(
        "ALTER TABLE split_box_slots ADD CONSTRAINT split_box_slots_status_check "
        "CHECK (status IN ('reserved', 'available', 'claimed', 'shipped', 'received'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE split_box_slots DROP CONSTRAINT IF EXISTS split_box_slots_status_check")
    op.execute(
        "ALTER TABLE split_box_slots ADD CONSTRAINT split_box_slots_status_check "
        "CHECK (status IN ('reserved', 'available', 'claimed', 'shipped'))"
    )
