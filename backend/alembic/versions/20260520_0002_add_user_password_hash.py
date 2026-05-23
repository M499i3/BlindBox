"""add user password_hash

Revision ID: 0002_user_password_hash
Revises: 0001_initial_schema
Create Date: 2026-05-20

"""
from pathlib import Path
import sys
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0002_user_password_hash"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(_SCRIPTS))
from auth_util import hash_password  # noqa: E402


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT")
    )
    default_hash = hash_password()
    bind.execute(
        text(
            "UPDATE users SET password_hash = :h WHERE password_hash IS NULL"
        ),
        {"h": default_hash},
    )
    bind.execute(
        text("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL")
    )


def downgrade() -> None:
    op.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS password_hash"))
