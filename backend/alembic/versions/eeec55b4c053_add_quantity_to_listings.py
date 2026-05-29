"""add quantity to listings"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "eeec55b4c053"
down_revision = "0003_chat_buyer_seller_order"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("listings", "quantity")