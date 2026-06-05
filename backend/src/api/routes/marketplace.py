from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends, Response

from api.dependencies import get_db
from application.marketplace_service import get_rankings, get_trending_tags
from domain.entities import MarketplaceRankingItem
from infrastructure.simple_cache import ttl_cache

router = APIRouter()

# Rankings change only when catalog_product_metrics is batch-refreshed (hourly at most).
# Trending tags depend on active listings which turn over slowly.
# Both are safe to cache for 5 minutes in-process and tell clients/CDN to do the same.
_TTL = 300  # seconds
_CC = "public, max-age=300, stale-while-revalidate=60"


@router.get("/trending-tags", response_model=list[str])
def trending_tags(
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[str]:
    response.headers["Cache-Control"] = _CC
    return ttl_cache("trending_tags", _TTL, lambda: get_trending_tags(conn))


@router.get("/rankings", response_model=list[MarketplaceRankingItem])
def rankings(
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[MarketplaceRankingItem]:
    response.headers["Cache-Control"] = _CC
    return ttl_cache("rankings", _TTL, lambda: get_rankings(conn))
