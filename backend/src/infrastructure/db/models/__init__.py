"""
ORM 模型（選用）。

初始 schema 由 migration `0001_initial_schema` 自 SQL 建立。
之後新增/修改表請：
  1. 在此定義或更新模型
  2. alembic revision --autogenerate -m "描述"
  3. alembic upgrade head
"""

from infrastructure.db.base import Base

__all__ = ["Base"]
