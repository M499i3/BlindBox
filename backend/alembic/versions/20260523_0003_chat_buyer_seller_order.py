"""chat buyer seller order columns

Revision ID: 0003_chat_buyer_seller_order
Revises: 0002_user_password_hash
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0003_chat_buyer_seller_order"
down_revision: Union[str, None] = "0002_user_password_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        text(
            """
            ALTER TABLE chats
              ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES users(id),
              ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id),
              ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id)
            """
        )
    )
    bind.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_listing_pair
              ON chats (listing_id, buyer_id, seller_id)
              WHERE listing_id IS NOT NULL
                AND buyer_id IS NOT NULL
                AND seller_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("DROP INDEX IF EXISTS idx_chats_listing_pair"))
    bind.execute(
        text(
            """
            ALTER TABLE chats
              DROP COLUMN IF EXISTS order_id,
              DROP COLUMN IF EXISTS seller_id,
              DROP COLUMN IF EXISTS buyer_id
            """
        )
    )
