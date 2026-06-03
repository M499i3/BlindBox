from __future__ import annotations

import psycopg2.extensions

from domain.entities import MarketplaceRankingItem
from infrastructure.db.repositories.listing_repository import get_active_listings


def get_trending_tags(conn: psycopg2.extensions.connection) -> list[str]:
    """根據現有上架品牌及系列計算熱門標籤。"""
    listings = get_active_listings(conn)

    tag_counts: dict[str, int] = {}
    for listing in listings:
        for tag in (listing.brand, listing.series):
            if tag:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT b.name
            FROM brands b
            ORDER BY b.name
            LIMIT 20
            """
        )
        rows = cur.fetchall()

    catalog_tags = [r["name"] for r in rows if r["name"]]
    popular = sorted(tag_counts.keys(), key=lambda t: -tag_counts[t])

    merged: list[str] = []
    seen = set()
    for t in popular + catalog_tags:
        if t not in seen:
            merged.append(t)
            seen.add(t)
    return merged[:20]


def get_rankings(conn: psycopg2.extensions.connection) -> list[MarketplaceRankingItem]:
    """依 catalog_product_metrics.heat_score 排序取前 10 項。"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                cp.external_id AS id,
                cp.title,
                cp.official_price_amount,
                cp.official_price_currency,
                cp.image_url,
                COALESCE(m.heat_score, 0) AS heat_score
            FROM catalog_products cp
            LEFT JOIN catalog_product_metrics m ON m.catalog_product_id = cp.id
            ORDER BY COALESCE(m.heat_score, 0) DESC, cp.updated_at DESC
            LIMIT 10
            """
        )
        rows = cur.fetchall()

    result: list[MarketplaceRankingItem] = []
    rank_labels = ["No.1", "No.2", "No.3", "No.4", "No.5", "No.6", "No.7", "No.8", "No.9", "No.10"]
    for i, row in enumerate(rows):
        amount = row.get("official_price_amount") or 0
        currency = row.get("official_price_currency") or "HKD"
        symbol = {"HKD": "HK$", "TWD": "NT$", "CNY": "¥"}.get(currency, "HK$")
        price = f"{symbol} {amount / 100:.2f}"
        heat_score = int(row.get("heat_score") or 0)
        result.append(
            MarketplaceRankingItem(
                id=row["id"] or str(i),
                rank=rank_labels[i] if i < len(rank_labels) else f"No.{i + 1}",
                title=row["title"],
                price=price,
                image=row["image_url"] or "",
                is_hot=i < 3 and heat_score > 0,
            )
        )
    return result
