"""add price_history table for secondary market transaction prices

Revision ID: 0005_add_price_history
Revises: 0004_listing_images_constraints
Create Date: 2026-05-19
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0005_add_price_history"
down_revision: Union[str, None] = "0008_catalog_product_metrics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    bind.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS price_history (
                id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                -- 對應官方圖鑑商品；模糊比對失敗時為 NULL，仍保留原始資料
                catalog_product_id UUID REFERENCES catalog_products(id) ON DELETE SET NULL,

                -- 成交價（整數最小單位：JPY 3200 = ¥3,200）
                price_amount       INT NOT NULL,
                price_currency     CHAR(3) NOT NULL,

                -- 資料來源
                source             TEXT NOT NULL,
                source_item_id     TEXT,
                source_title       TEXT,

                -- 成色
                condition          TEXT,

                -- 模糊比對信心分數（0–100）
                match_score        NUMERIC(5,2),

                traded_at          TIMESTAMPTZ NOT NULL,
                created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

                UNIQUE (source, source_item_id)
            )
            """
        )
    )

    bind.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_price_history_product_time
                ON price_history(catalog_product_id, traded_at DESC)
                WHERE catalog_product_id IS NOT NULL
            """
        )
    )

    bind.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_price_history_source
                ON price_history(source, source_item_id)
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("DROP TABLE IF EXISTS price_history"))
