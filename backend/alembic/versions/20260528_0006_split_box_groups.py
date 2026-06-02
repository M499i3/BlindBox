"""split box groups and slots

Revision ID: 0006_split_box_groups
Revises: 0005_migrate_allow_swap_to_swap
Create Date: 2026-05-28
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0006_split_box_groups"
down_revision: Union[str, None] = "0005_migrate_allow_swap_to_swap"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        text(
            """
            CREATE TYPE split_box_status_enum AS ENUM (
                'open', 'full', 'shipping', 'completed', 'cancelled', 'expired'
            );

            CREATE TABLE split_box_groups (
                id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organizer_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                brand_id                UUID REFERENCES brands(id) ON DELETE SET NULL,
                series_id               UUID REFERENCES series(id) ON DELETE SET NULL,
                title                   TEXT NOT NULL,
                description             TEXT,
                cover_image             TEXT,
                status                  split_box_status_enum NOT NULL DEFAULT 'open',
                shipping_method         shipping_method_enum,
                shipping_note           TEXT,
                total_price_amount      INT NOT NULL DEFAULT 0,
                price_per_slot_amount   INT NOT NULL DEFAULT 0,
                target_count            SMALLINT NOT NULL DEFAULT 0,
                reserved_count          SMALLINT NOT NULL DEFAULT 0,
                claimed_count           SMALLINT NOT NULL DEFAULT 0,
                closes_at               TIMESTAMPTZ,
                shipped_at              TIMESTAMPTZ,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE INDEX idx_split_box_groups_organizer ON split_box_groups(organizer_id);
            CREATE INDEX idx_split_box_groups_status ON split_box_groups(status, created_at DESC);

            CREATE TABLE split_box_slots (
                id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id                    UUID NOT NULL REFERENCES split_box_groups(id) ON DELETE CASCADE,
                catalog_product_external_id TEXT NOT NULL,
                product_title               TEXT NOT NULL,
                product_image               TEXT,
                listing_id                  UUID REFERENCES listings(id) ON DELETE SET NULL,
                reserved_by_host            BOOLEAN NOT NULL DEFAULT false,
                claimed_by_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
                claimed_at                  TIMESTAMPTZ,
                price_amount                INT NOT NULL DEFAULT 0,
                status                      TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('reserved', 'available', 'claimed')),
                UNIQUE (group_id, catalog_product_external_id)
            );

            CREATE INDEX idx_split_box_slots_group ON split_box_slots(group_id);
            CREATE INDEX idx_split_box_slots_listing ON split_box_slots(listing_id);

            ALTER TABLE listings
                ADD COLUMN split_box_group_id UUID REFERENCES split_box_groups(id) ON DELETE SET NULL,
                ADD COLUMN split_box_slot_id UUID REFERENCES split_box_slots(id) ON DELETE SET NULL;

            CREATE INDEX idx_listings_split_box_group ON listings(split_box_group_id);
            """
        )
    )


def downgrade() -> None:
    op.execute(
        text(
            """
            ALTER TABLE listings DROP COLUMN IF EXISTS split_box_slot_id;
            ALTER TABLE listings DROP COLUMN IF EXISTS split_box_group_id;
            DROP TABLE IF EXISTS split_box_slots CASCADE;
            DROP TABLE IF EXISTS split_box_groups CASCADE;
            DROP TYPE IF EXISTS split_box_status_enum;
            """
        )
    )
