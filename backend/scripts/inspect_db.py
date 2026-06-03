#!/usr/bin/env python3
"""列出 public schema 的表、筆數、欄位（不輸出密碼）。"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT / "src"))

from infrastructure.db.config import get_database_url  # noqa: E402


def main() -> None:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import RealDictCursor

    url = get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)
    host = url.split("@")[-1].split("/")[0] if "@" in url else "(local)"
    print(f"連線主機: {host}\n")

    conn = psycopg2.connect(url)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """
            )
            tables = [r["table_name"] for r in cur.fetchall()]

            print("=== 資料表與筆數 (public) ===")
            print(f"共 {len(tables)} 張表\n")
            for t in tables:
                cur.execute(
                    sql.SQL("SELECT COUNT(*) AS n FROM {}").format(sql.Identifier(t))
                )
                n = cur.fetchone()["n"]
                print(f"  {t}: {n}")

            print("\n=== 欄位定義 ===")
            cur.execute(
                """
                SELECT table_name, column_name, data_type, udt_name,
                       is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
                """
            )
            current: str | None = None
            for r in cur.fetchall():
                if r["table_name"] != current:
                    current = r["table_name"]
                    print(f"\n## {current}")
                nullable = "NULL" if r["is_nullable"] == "YES" else "NOT NULL"
                default = ""
                if r["column_default"]:
                    d = str(r["column_default"])
                    default = f"  default={d[:60]}{'…' if len(d) > 60 else ''}"
                print(
                    f"  {r['column_name']}: {r['data_type']} ({r['udt_name']}) "
                    f"{nullable}{default}"
                )

            cur.execute(
                """
                SELECT t.typname AS enum_name,
                       array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
                FROM pg_type t
                JOIN pg_enum e ON e.enumtypid = t.oid
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public'
                GROUP BY t.typname
                ORDER BY t.typname
                """
            )
            enums = cur.fetchall()
            if enums:
                print("\n=== ENUM 型別 ===")
                for r in enums:
                    labels = ", ".join(r["labels"])
                    print(f"  {r['enum_name']}: [{labels}]")

            cur.execute("SELECT version_num FROM alembic_version LIMIT 1")
            row = cur.fetchone()
            if row:
                print(f"\n=== Alembic ===\n  version: {row['version_num']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
