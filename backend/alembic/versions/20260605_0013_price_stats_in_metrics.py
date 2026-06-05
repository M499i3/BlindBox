"""Add price stats columns to catalog_product_metrics.

Stores pre-computed price history summaries so product detail pages can
display last trade price (with change %) and 90-day price range without
querying price_history on every request.

New columns:
  last_traded_price  INT          — most recent trade price
  last_traded_at     TIMESTAMPTZ  — when that trade happened
  prev_traded_price  INT          — second-most-recent (for % change)
  price_90d_min      INT          — 90-day low
  price_90d_max      INT          — 90-day high
  price_90d_count    INT          — number of trades in 90 days

Revision ID: 0013_price_stats_in_metrics
Revises: 0012_price_history_redesign
"""

from __future__ import annotations

from alembic import op

revision = "0013_price_stats_in_metrics"
down_revision = "0012_price_history_redesign"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE catalog_product_metrics
            ADD COLUMN IF NOT EXISTS last_traded_price  INT,
            ADD COLUMN IF NOT EXISTS last_traded_at     TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS prev_traded_price  INT,
            ADD COLUMN IF NOT EXISTS price_90d_min      INT,
            ADD COLUMN IF NOT EXISTS price_90d_max      INT,
            ADD COLUMN IF NOT EXISTS price_90d_count    INT NOT NULL DEFAULT 0
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE catalog_product_metrics
            DROP COLUMN IF EXISTS price_90d_count,
            DROP COLUMN IF EXISTS price_90d_max,
            DROP COLUMN IF EXISTS price_90d_min,
            DROP COLUMN IF EXISTS prev_traded_price,
            DROP COLUMN IF EXISTS last_traded_at,
            DROP COLUMN IF EXISTS last_traded_price
        """
    )
