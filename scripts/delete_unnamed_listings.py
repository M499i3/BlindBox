from __future__ import annotations

import argparse
import os
import re
from typing import Iterable

import psycopg2
from psycopg2.extras import RealDictCursor


def load_database_url() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        return dsn
    # fallback to .env in repo root
    try:
        txt = open(".env", "r", encoding="utf-8").read()
    except FileNotFoundError:
        txt = ""
    m = re.search(r"^DATABASE_URL=(.+)$", txt, flags=re.M)
    if not m:
        raise RuntimeError("DATABASE_URL not set and not found in .env")
    return m.group(1).strip()


def chunks(xs: list[str], n: int) -> Iterable[list[str]]:
    for i in range(0, len(xs), n):
        yield xs[i : i + n]


WHERE = (
    "(title IS NULL OR btrim(title) = '' OR title = '未命名貼文' OR title ILIKE '%未命名%') "
    "AND deleted_at IS NULL"
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Actually delete matched rows")
    args = ap.parse_args()

    dsn = load_database_url()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT count(*) AS n FROM listings WHERE {WHERE};")
            n = int(cur.fetchone()["n"])
            cur.execute(
                f"SELECT id::text AS id, title, item_name, created_at "
                f"FROM listings WHERE {WHERE} ORDER BY created_at DESC LIMIT 50;"
            )
            sample = cur.fetchall()

            print(f"matched_listings={n}")
            for r in sample:
                print(f"{r['id']}\t{r['created_at']}\t{r['title']}\t/\t{r['item_name']}")

            if not args.apply:
                print("dry_run_only (use --apply to delete)")
                return 0

            # collect ids (delete via id list to avoid surprises)
            cur.execute(f"SELECT id::text AS id FROM listings WHERE {WHERE};")
            ids = [row["id"] for row in cur.fetchall()]
            if not ids:
                print("nothing_to_delete")
                return 0

            deleted = 0
            for batch in chunks(ids, 500):
                cur.execute("DELETE FROM listings WHERE id = ANY(%s::uuid[]);", (batch,))
                deleted += cur.rowcount
            print(f"deleted_listings={deleted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

