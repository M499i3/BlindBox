"""add constraints for listing_images upload limits

Revision ID: 0004_listing_images_constraints
Revises: eeec55b4c053
Create Date: 2026-06-02
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0004_listing_images_constraints"
down_revision: Union[str, None] = "eeec55b4c053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        text(
            """
            DELETE FROM listing_images li
            USING listing_images dup
            WHERE li.id = dup.id
              AND dup.sort_order NOT BETWEEN 0 AND 8
            """
        )
    )
    bind.execute(
        text(
            """
            WITH ranked AS (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY listing_id, sort_order
                  ORDER BY created_at ASC, id ASC
                ) AS rn
              FROM listing_images
              WHERE sort_order BETWEEN 0 AND 8
            )
            DELETE FROM listing_images li
            USING ranked r
            WHERE li.id = r.id
              AND r.rn > 1
            """
        )
    )
    bind.execute(
        text(
            """
            ALTER TABLE listing_images
              ADD CONSTRAINT chk_listing_images_sort_order
              CHECK (sort_order BETWEEN 0 AND 8)
            """
        )
    )
    bind.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_images_listing_sort_order
              ON listing_images (listing_id, sort_order)
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("DROP INDEX IF EXISTS uq_listing_images_listing_sort_order"))
    bind.execute(
        text(
            """
            ALTER TABLE listing_images
            DROP CONSTRAINT IF EXISTS chk_listing_images_sort_order
            """
        )
    )
