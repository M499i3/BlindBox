from __future__ import annotations

import psycopg2.extensions
from fastapi import APIRouter, Depends

from api.dependencies import get_db
from application.marketplace_service import get_rankings, get_trending_tags
from domain.entities import MarketplaceRankingItem

router = APIRouter()


@router.get("/trending-tags", response_model=list[str])
def trending_tags(
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[str]:
    return get_trending_tags(conn)


@router.get("/rankings", response_model=list[MarketplaceRankingItem])
def rankings(
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[MarketplaceRankingItem]:
    return get_rankings(conn)
