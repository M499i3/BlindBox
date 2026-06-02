"""migrate allow_swap sell listings to swap trade_mode

Revision ID: 0005_migrate_allow_swap_to_swap
Revises: 0004_listing_images_constraints
Create Date: 2026-05-28
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0005_migrate_allow_swap_to_swap"
down_revision: Union[str, None] = "0004_listing_images_constraints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 舊版「我要賣 + 開放交換」→ 統一為「我想換」
    op.execute(
        text(
            """
            UPDATE listings
            SET trade_mode = 'swap',
                updated_at = now()
            WHERE allow_swap = true
              AND trade_mode = 'sell'
              AND deleted_at IS NULL
            """
        )
    )


def downgrade() -> None:
    # 無法還原原始 trade_mode，降級時維持 swap
    pass
