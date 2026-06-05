from __future__ import annotations

import math
from typing import Literal

import psycopg2.extensions
from psycopg2.extras import execute_values

HeatSource = Literal["koca", "blended", "internal"]

KOCA_WEIGHT_SELLER = 3.0
KOCA_WEIGHT_COLLECTED = 2.0
KOCA_WEIGHT_LISTING = 5.0
INTERNAL_WEIGHT_ORDERS = 5.0
INTERNAL_WEIGHT_WISHES = 2.0
INTERNAL_WEIGHT_SEARCHES = 1.0
ALPHA_BASE = 0.85
ALPHA_MIN = 0.15
ALPHA_MAX = 0.85
INTERNAL_SAMPLE_DIVISOR = 50.0


def koca_raw_score(seller_count: int, collected_count: int, market_listing_count: int) -> float:
    return (
        KOCA_WEIGHT_SELLER * math.log1p(max(0, seller_count))
        + KOCA_WEIGHT_COLLECTED * math.log1p(max(0, collected_count))
        + KOCA_WEIGHT_LISTING * math.log1p(max(0, market_listing_count))
    )


def internal_raw_score(order_count: int, wish_count: int, search_count: int) -> float:
    return (
        INTERNAL_WEIGHT_ORDERS * math.log1p(max(0, order_count))
        + INTERNAL_WEIGHT_WISHES * math.log1p(max(0, wish_count))
        + INTERNAL_WEIGHT_SEARCHES * math.log1p(max(0, search_count))
    )


def normalize_scores(raw_by_id: dict[str, float]) -> dict[str, int]:
    if not raw_by_id:
        return {}
    max_raw = max(raw_by_id.values())
    if max_raw <= 0:
        return {product_id: 0 for product_id in raw_by_id}
    return {
        product_id: min(100, int(round(raw / max_raw * 100)))
        for product_id, raw in raw_by_id.items()
    }


def blend_alpha(global_monthly_order_sum: int) -> float:
    factor = min(1.0, max(0, global_monthly_order_sum) / INTERNAL_SAMPLE_DIVISOR)
    return max(ALPHA_MIN, min(ALPHA_MAX, ALPHA_BASE - factor))


def heat_source_from_alpha(alpha: float) -> HeatSource:
    if alpha >= 0.7:
        return "koca"
    if alpha <= 0.3:
        return "internal"
    return "blended"


def blend_heat_score(koca_heat_score: int, internal_heat_score: int, alpha: float) -> int:
    blended = alpha * koca_heat_score + (1.0 - alpha) * internal_heat_score
    return min(100, max(0, int(round(blended))))


def _fetch_monthly_order_counts(conn: psycopg2.extensions.connection) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT l.catalog_product_id::text AS catalog_product_id,
                   COUNT(*)::int AS monthly_order_count
            FROM orders o
            JOIN listings l ON l.id = o.listing_id
            WHERE o.status = 'completed'
              AND o.completed_at >= now() - interval '30 days'
              AND o.deleted_at IS NULL
              AND l.catalog_product_id IS NOT NULL
            GROUP BY l.catalog_product_id
            """
        )
        rows = cur.fetchall()
    return {row["catalog_product_id"]: row["monthly_order_count"] for row in rows}


def _fetch_monthly_wish_counts(conn: psycopg2.extensions.connection) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT catalog_product_id::text AS catalog_product_id,
                   COUNT(*)::int AS monthly_wish_count
            FROM user_collections
            WHERE type = 'wishlist'::collection_type_enum
              AND added_at >= now() - interval '30 days'
            GROUP BY catalog_product_id
            """
        )
        rows = cur.fetchall()
    return {row["catalog_product_id"]: row["monthly_wish_count"] for row in rows}


def _ensure_metrics_rows(conn: psycopg2.extensions.connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO catalog_product_metrics (catalog_product_id)
            SELECT cp.id
            FROM catalog_products cp
            ON CONFLICT (catalog_product_id) DO NOTHING
            """
        )


def compute_catalog_heat(conn: psycopg2.extensions.connection) -> int:
    """Roll up monthly site metrics and recompute internal / blended heat scores."""
    _ensure_metrics_rows(conn)

    order_counts = _fetch_monthly_order_counts(conn)
    wish_counts = _fetch_monthly_wish_counts(conn)
    global_order_sum = sum(order_counts.values())

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT catalog_product_id::text AS catalog_product_id,
                   koca_heat_score
            FROM catalog_product_metrics
            """
        )
        metric_rows = cur.fetchall()

    internal_raw: dict[str, float] = {}
    updates: list[tuple] = []

    for row in metric_rows:
        product_id = row["catalog_product_id"]
        monthly_orders = order_counts.get(product_id, 0)
        monthly_wishes = wish_counts.get(product_id, 0)
        monthly_searches = 0
        internal_raw[product_id] = internal_raw_score(
            monthly_orders, monthly_wishes, monthly_searches
        )
        updates.append(
            (
                monthly_orders,
                monthly_searches,
                monthly_wishes,
                product_id,
            )
        )

    internal_scores = normalize_scores(internal_raw)
    alpha = blend_alpha(global_order_sum)
    source = heat_source_from_alpha(alpha)

    monthly_rows = [
        (monthly_orders, monthly_searches, monthly_wishes, product_id)
        for monthly_orders, monthly_searches, monthly_wishes, product_id in updates
    ]
    heat_rows = [
        (
            internal_scores.get(row["catalog_product_id"], 0),
            blend_heat_score(
                int(row["koca_heat_score"] or 0),
                internal_scores.get(row["catalog_product_id"], 0),
                alpha,
            ),
            source,
            row["catalog_product_id"],
        )
        for row in metric_rows
    ]

    with conn.cursor() as cur:
        if monthly_rows:
            execute_values(
                cur,
                """
                UPDATE catalog_product_metrics AS m
                SET monthly_order_count = v.monthly_order_count,
                    monthly_search_count = v.monthly_search_count,
                    monthly_wish_count = v.monthly_wish_count
                FROM (VALUES %s) AS v(monthly_order_count, monthly_search_count, monthly_wish_count, catalog_product_id)
                WHERE m.catalog_product_id = v.catalog_product_id::uuid
                """,
                monthly_rows,
                page_size=500,
            )
        if heat_rows:
            execute_values(
                cur,
                """
                UPDATE catalog_product_metrics AS m
                SET internal_heat_score = v.internal_heat_score,
                    heat_score = v.heat_score,
                    heat_source = v.heat_source,
                    computed_at = now()
                FROM (VALUES %s) AS v(internal_heat_score, heat_score, heat_source, catalog_product_id)
                WHERE m.catalog_product_id = v.catalog_product_id::uuid
                """,
                heat_rows,
                page_size=500,
            )

    conn.commit()
    return len(metric_rows)


def import_koca_metrics(
    conn: psycopg2.extensions.connection,
    koca_products: list[dict],
) -> int:
    """Import KOCA snapshot fields and normalized koca_heat_score."""
    external_to_koca: dict[str, dict] = {}
    for raw in koca_products:
        external_id = str(raw.get("id") or "").strip()
        if external_id:
            external_to_koca[external_id] = raw

    if not external_to_koca:
        return 0

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text AS id, external_id
            FROM catalog_products
            WHERE external_id = ANY(%s)
            """,
            (list(external_to_koca.keys()),),
        )
        catalog_rows = cur.fetchall()

    raw_by_product_id: dict[str, float] = {}
    koca_fields_by_product_id: dict[str, tuple[int, int, int]] = {}

    for row in catalog_rows:
        external_id = row["external_id"]
        product_id = row["id"]
        raw = external_to_koca.get(external_id, {})
        seller = int(raw.get("numOfSeller") or 0)
        collected = int(raw.get("numOfCollected") or 0)
        market_price = raw.get("marketPrice") if isinstance(raw.get("marketPrice"), dict) else {}
        listing_count = int(market_price.get("listingCount") or 0)
        raw_by_product_id[product_id] = koca_raw_score(seller, collected, listing_count)
        koca_fields_by_product_id[product_id] = (seller, collected, listing_count)

    koca_scores = normalize_scores(raw_by_product_id)

    rows = [
        (
            product_id,
            seller,
            collected,
            listing_count,
            koca_scores.get(product_id, 0),
            koca_scores.get(product_id, 0),
        )
        for product_id, (seller, collected, listing_count) in koca_fields_by_product_id.items()
    ]

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO catalog_product_metrics (
                catalog_product_id,
                koca_seller_count,
                koca_collected_count,
                koca_market_listing_count,
                koca_heat_score,
                koca_refreshed_at,
                heat_score,
                heat_source,
                computed_at
            ) VALUES %s
            ON CONFLICT (catalog_product_id) DO UPDATE SET
                koca_seller_count = EXCLUDED.koca_seller_count,
                koca_collected_count = EXCLUDED.koca_collected_count,
                koca_market_listing_count = EXCLUDED.koca_market_listing_count,
                koca_heat_score = EXCLUDED.koca_heat_score,
                koca_refreshed_at = now()
            """,
            rows,
            template="(%s::uuid, %s, %s, %s, %s, now(), %s, 'koca', now())",
            page_size=500,
        )

    conn.commit()
    return len(koca_fields_by_product_id)


def compute_price_stats(conn: psycopg2.extensions.connection) -> int:
    """Pre-compute per-product price stats from price_history into catalog_product_metrics.

    Populates:
      last_traded_price / last_traded_at  — most recent completed trade
      prev_traded_price                   — second-most-recent (for % change)
      price_90d_min / price_90d_max       — 90-day range
      price_90d_count                     — number of trades in last 90 days
    """
    _ensure_metrics_rows(conn)

    with conn.cursor() as cur:
        cur.execute(
            """
            WITH ranked AS (
                SELECT
                    catalog_product_id,
                    price_amount,
                    traded_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY catalog_product_id ORDER BY traded_at DESC
                    ) AS rn
                FROM price_history
                WHERE catalog_product_id IS NOT NULL
            ),
            stats AS (
                SELECT
                    catalog_product_id,
                    MAX(CASE WHEN rn = 1 THEN price_amount END) AS last_traded_price,
                    MAX(CASE WHEN rn = 1 THEN traded_at    END) AS last_traded_at,
                    MAX(CASE WHEN rn = 2 THEN price_amount END) AS prev_traded_price,
                    MIN(CASE WHEN traded_at >= now() - interval '90 days'
                             THEN price_amount END)             AS price_90d_min,
                    MAX(CASE WHEN traded_at >= now() - interval '90 days'
                             THEN price_amount END)             AS price_90d_max,
                    COUNT(CASE WHEN traded_at >= now() - interval '90 days'
                               THEN 1 END)::int                 AS price_90d_count
                FROM ranked
                GROUP BY catalog_product_id
            )
            UPDATE catalog_product_metrics m
            SET last_traded_price = s.last_traded_price,
                last_traded_at    = s.last_traded_at,
                prev_traded_price = s.prev_traded_price,
                price_90d_min     = s.price_90d_min,
                price_90d_max     = s.price_90d_max,
                price_90d_count   = COALESCE(s.price_90d_count, 0),
                computed_at       = now()
            FROM stats s
            WHERE m.catalog_product_id = s.catalog_product_id
            """
        )
        updated = cur.rowcount

    conn.commit()
    return updated
