from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基底；新增資料表模型後可供 Alembic autogenerate 使用。"""

    pass
