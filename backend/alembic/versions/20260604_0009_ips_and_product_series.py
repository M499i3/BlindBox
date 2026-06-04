"""Rename catalog series table to ips; add product-line series table.

Revision ID: 0009_ips_and_product_series
Revises: 0008_catalog_product_metrics

Target model:
  brands → ips (former `series`, one row per IP)
        → series (new, deriveSeriesName product lines)
              → catalog_products

Existing FK data:
  - catalog_products.series_id / listings.series_id / split_box_groups.series_id
    pointed at IP rows; renamed to ip_id, then new nullable series_id added.
  - Run `python backend/scripts/backfill_product_series.py --apply` after migrate.
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import text

revision = "0009_ips_and_product_series"
down_revision = "0008_catalog_product_metrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        text(
            """
            -- 1) IP 層：原 series 表改名
            ALTER TABLE series RENAME TO ips;

            ALTER INDEX IF EXISTS series_pkey RENAME TO ips_pkey;
            ALTER INDEX IF EXISTS series_brand_id_slug_key RENAME TO ips_brand_id_slug_key;

            -- 2) catalog_products：原 series_id → ip_id
            ALTER TABLE catalog_products RENAME COLUMN series_id TO ip_id;
            ALTER INDEX IF EXISTS idx_catalog_products_series
                RENAME TO idx_catalog_products_ip;

            -- 3) listings：原 series_id 為 IP，改名後另加產品線 series_id
            ALTER TABLE listings RENAME COLUMN series_id TO ip_id;
            DROP INDEX IF EXISTS idx_listings_brand_series;
            CREATE INDEX idx_listings_brand_ip
                ON listings(brand_id, ip_id) WHERE deleted_at IS NULL;

            -- 4) split_box_groups：同上
            ALTER TABLE split_box_groups RENAME COLUMN series_id TO ip_id;

            -- 5) 產品線 series 表（新）
            CREATE TABLE series (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
                ip_id       UUID NOT NULL REFERENCES ips(id) ON DELETE RESTRICT,
                slug        TEXT NOT NULL,
                name        TEXT NOT NULL,
                cover_url   TEXT,
                total_count INT NOT NULL DEFAULT 0,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (brand_id, ip_id, slug)
            );

            CREATE INDEX idx_series_brand_ip ON series(brand_id, ip_id);
            CREATE INDEX idx_series_ip ON series(ip_id);

            -- 6) 掛回產品線 FK
            ALTER TABLE catalog_products
                ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE SET NULL;
            CREATE INDEX idx_catalog_products_product_series
                ON catalog_products(series_id);

            ALTER TABLE listings
                ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE SET NULL;
            CREATE INDEX idx_listings_brand_product_series
                ON listings(brand_id, series_id) WHERE deleted_at IS NULL;

            ALTER TABLE split_box_groups
                ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE SET NULL;
            CREATE INDEX idx_split_box_groups_product_series
                ON split_box_groups(series_id);
            """
        )
    )


def downgrade() -> None:
    op.execute(
        text(
            """
            ALTER TABLE split_box_groups DROP COLUMN IF EXISTS series_id;
            DROP INDEX IF EXISTS idx_split_box_groups_product_series;

            ALTER TABLE listings DROP COLUMN IF EXISTS series_id;
            DROP INDEX IF EXISTS idx_listings_brand_product_series;

            ALTER TABLE catalog_products DROP COLUMN IF EXISTS series_id;
            DROP INDEX IF EXISTS idx_catalog_products_product_series;

            DROP TABLE IF EXISTS series CASCADE;

            ALTER TABLE split_box_groups RENAME COLUMN ip_id TO series_id;

            DROP INDEX IF EXISTS idx_listings_brand_ip;
            ALTER TABLE listings RENAME COLUMN ip_id TO series_id;
            CREATE INDEX idx_listings_brand_series
                ON listings(brand_id, series_id) WHERE deleted_at IS NULL;

            ALTER INDEX IF EXISTS idx_catalog_products_ip
                RENAME TO idx_catalog_products_series;
            ALTER TABLE catalog_products RENAME COLUMN ip_id TO series_id;

            ALTER INDEX IF EXISTS ips_brand_id_slug_key RENAME TO series_brand_id_slug_key;
            ALTER INDEX IF EXISTS ips_pkey RENAME TO series_pkey;
            ALTER TABLE ips RENAME TO series;
            """
        )
    )
