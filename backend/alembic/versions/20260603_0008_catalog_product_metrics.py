"""Add catalog_product_metrics for ranking heat scores.

Revision ID: 0008_catalog_product_metrics
Revises: 0007_listing_shipping_methods
"""

from __future__ import annotations

from alembic import op

revision = "0008_catalog_product_metrics"
down_revision = "0007_listing_shipping_methods"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE catalog_product_metrics (
            catalog_product_id      UUID PRIMARY KEY
                REFERENCES catalog_products(id) ON DELETE CASCADE,
            koca_seller_count       INT NOT NULL DEFAULT 0,
            koca_collected_count    INT NOT NULL DEFAULT 0,
            koca_market_listing_count INT NOT NULL DEFAULT 0,
            koca_heat_score         SMALLINT NOT NULL DEFAULT 0
                CHECK (koca_heat_score BETWEEN 0 AND 100),
            koca_refreshed_at       TIMESTAMPTZ,
            monthly_order_count     INT NOT NULL DEFAULT 0,
            monthly_search_count    INT NOT NULL DEFAULT 0,
            monthly_wish_count      INT NOT NULL DEFAULT 0,
            internal_heat_score     SMALLINT NOT NULL DEFAULT 0
                CHECK (internal_heat_score BETWEEN 0 AND 100),
            heat_score              SMALLINT NOT NULL DEFAULT 0
                CHECK (heat_score BETWEEN 0 AND 100),
            heat_source             TEXT NOT NULL DEFAULT 'koca'
                CHECK (heat_source IN ('koca', 'blended', 'internal')),
            computed_at             TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute(
        """
        CREATE INDEX idx_catalog_product_metrics_heat
            ON catalog_product_metrics(heat_score DESC);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS catalog_product_metrics;")
