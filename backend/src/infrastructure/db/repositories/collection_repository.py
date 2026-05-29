from __future__ import annotations

import psycopg2.extensions


def _resolve_catalog_product_id(
    cur: psycopg2.extensions.cursor, product_id: str
) -> str | None:
    cur.execute(
        """
        SELECT id FROM catalog_products
        WHERE external_id = %s OR id::text = %s
        LIMIT 1
        """,
        (product_id, product_id),
    )
    row = cur.fetchone()
    return str(row["id"]) if row else None


def get_user_collection_ids(
    conn: psycopg2.extensions.connection, user_id: str
) -> dict[str, list[str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                uc.type::text AS type,
                COALESCE(cp.external_id, cp.id::text) AS product_id
            FROM user_collections uc
            JOIN catalog_products cp ON cp.id = uc.catalog_product_id
            WHERE uc.user_id = %s
            ORDER BY uc.added_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    collected: list[str] = []
    wishlist: list[str] = []
    for row in rows:
        r = dict(row)
        pid = str(r["product_id"])
        if r["type"] == "collected":
            collected.append(pid)
        elif r["type"] == "wishlist":
            wishlist.append(pid)
    return {"collected": collected, "wishlist": wishlist}


def add_collection_item(
    conn: psycopg2.extensions.connection,
    user_id: str,
    product_id: str,
    collection_type: str,
) -> None:
    with conn.cursor() as cur:
        catalog_id = _resolve_catalog_product_id(cur, product_id)
        if not catalog_id:
            raise ValueError(f"找不到圖鑑商品：{product_id}")
        cur.execute(
            """
            INSERT INTO user_collections (user_id, catalog_product_id, type)
            VALUES (%s, %s, %s::collection_type_enum)
            ON CONFLICT (user_id, catalog_product_id, type) DO NOTHING
            """,
            (user_id, catalog_id, collection_type),
        )
    conn.commit()


def remove_collection_item(
    conn: psycopg2.extensions.connection,
    user_id: str,
    product_id: str,
    collection_type: str,
) -> None:
    with conn.cursor() as cur:
        catalog_id = _resolve_catalog_product_id(cur, product_id)
        if not catalog_id:
            return
        cur.execute(
            """
            DELETE FROM user_collections
            WHERE user_id = %s AND catalog_product_id = %s AND type = %s::collection_type_enum
            """,
            (user_id, catalog_id, collection_type),
        )
    conn.commit()
