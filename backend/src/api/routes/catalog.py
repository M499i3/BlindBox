from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from api.dependencies import get_db
from application.catalog_service import (
    catalog_search,
    derive_brand_label,
    get_product,
    list_brands,
    list_ips,
    list_products,
    list_series,
    list_styles,
)
from domain.entities import CatalogProduct

router = APIRouter()


@router.get("/search")
def search_catalog(
    q: Annotated[str, Query(min_length=1, description="搜尋關鍵字")],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    return catalog_search(conn, q)


_CATALOG_CACHE = "public, max-age=300, stale-while-revalidate=60"


@router.get("/products", response_model=list[CatalogProduct])
def get_products(
    response: Response,
    q: Annotated[str | None, Query(description="搜尋關鍵字")] = None,
    brand: Annotated[str | None, Query(description="品牌 slug")] = None,
    ip: Annotated[str | None, Query(description="IP slug")] = None,
    series: Annotated[str | None, Query(description="產品線系列 slug")] = None,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[CatalogProduct]:
    response.headers["Cache-Control"] = _CATALOG_CACHE
    return list_products(conn, query=q, brand=brand, ip=ip, series=series)


@router.get("/products/{product_id}", response_model=CatalogProduct)
def get_product_by_id(
    product_id: str,
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> CatalogProduct:
    product = get_product(conn, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"找不到商品：{product_id}")
    response.headers["Cache-Control"] = _CATALOG_CACHE
    return product


@router.get("/brands")
def get_brands(
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = _CATALOG_CACHE
    rows = list_brands(conn)
    if rows:
        return [
            {"name": r["name"], "slug": r["slug"], "image": r.get("image") or ""}
            for r in rows
        ]

    products = list_products(conn)
    seen: dict[str, str] = {}
    for p in products:
        label = derive_brand_label(p.title)
        if label not in seen:
            seen[label] = p.image
    return [{"name": name, "slug": name.lower().replace(" ", "-"), "image": image} for name, image in seen.items()]


@router.get("/ips")
def get_ips(
    brand: Annotated[str, Query(description="品牌 slug")],
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = _CATALOG_CACHE
    return list_ips(conn, brand)


@router.get("/series")
def get_series(
    brand: Annotated[str, Query(description="品牌 slug")],
    response: Response,
    ip: Annotated[str | None, Query(description="IP slug（可選）")] = None,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = _CATALOG_CACHE
    return list_series(conn, brand, ip_slug=ip)


@router.get("/styles")
def get_styles(
    brand: Annotated[str, Query(description="品牌 slug")],
    series: Annotated[str, Query(description="產品線系列 slug")],
    ip: Annotated[str, Query(description="IP slug")],
    response: Response,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = _CATALOG_CACHE
    return list_styles(conn, brand, series, ip)
