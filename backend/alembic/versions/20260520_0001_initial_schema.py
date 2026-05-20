"""initial schema (BlindBox PostgreSQL)

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-20

"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SQL_PATH = (
    Path(__file__).resolve().parents[2] / "migrations" / "sql" / "initial_schema.sql"
)


def _schema_already_exists() -> bool:
    """若曾在 SQL Editor 手動建表，或上次 migration 中斷，避免 DuplicateTable。"""
    bind = op.get_bind()
    return bool(bind.execute(text("SELECT to_regclass('public.brands')")).scalar())


def upgrade() -> None:
    if _schema_already_exists():
        # 表已存在：略過建表 SQL，Alembic 仍會寫入 alembic_version
        return
    sql = _SQL_PATH.read_text(encoding="utf-8")
    op.get_bind().exec_driver_sql(sql)


def downgrade() -> None:
    # 依相依順序移除（與 initial_schema.sql 相反）
    op.execute(
        """
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS message_reads CASCADE;
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS chat_participants CASCADE;
        DROP TABLE IF EXISTS chats CASCADE;
        DROP TABLE IF EXISTS swap_proposals CASCADE;
        DROP TABLE IF EXISTS group_buy_members CASCADE;
        DROP TABLE IF EXISTS group_buys CASCADE;
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS user_ratings CASCADE;
        DROP TABLE IF EXISTS cart_items CASCADE;
        DROP TABLE IF EXISTS listing_images CASCADE;
        DROP TABLE IF EXISTS listings CASCADE;
        DROP TABLE IF EXISTS user_collections CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS catalog_products CASCADE;
        DROP TABLE IF EXISTS series CASCADE;
        DROP TABLE IF EXISTS brands CASCADE;

        DROP TYPE IF EXISTS notification_type_enum CASCADE;
        DROP TYPE IF EXISTS message_type_enum CASCADE;
        DROP TYPE IF EXISTS chat_status_enum CASCADE;
        DROP TYPE IF EXISTS group_buy_status_enum CASCADE;
        DROP TYPE IF EXISTS swap_proposal_status_enum CASCADE;
        DROP TYPE IF EXISTS order_status_enum CASCADE;
        DROP TYPE IF EXISTS listing_status_enum CASCADE;
        DROP TYPE IF EXISTS shipping_method_enum CASCADE;
        DROP TYPE IF EXISTS trade_mode_enum CASCADE;
        DROP TYPE IF EXISTS listing_condition_enum CASCADE;
        DROP TYPE IF EXISTS collection_type_enum CASCADE;
        DROP TYPE IF EXISTS user_status_enum CASCADE;
        """
    )
