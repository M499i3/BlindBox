from __future__ import annotations

from typing import Annotated

import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException, Query

from api.dependencies import get_db
from application.catalog_service import (
    derive_brand_label,
    get_product,
    list_brands,
    list_products,
    list_series,
    list_styles,
)
from domain.entities import CatalogProduct

router = APIRouter()


@router.get("/products", response_model=list[CatalogProduct])
def get_products(
    q: Annotated[str | None, Query(description="搜尋關鍵字")] = None,
    brand: Annotated[str | None, Query(description="品牌 slug")] = None,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[CatalogProduct]:
    return list_products(conn, query=q, brand=brand)


@router.get("/products/{product_id}", response_model=CatalogProduct)
def get_product_by_id(
    product_id: str,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> CatalogProduct:
    product = get_product(conn, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"找不到商品：{product_id}")
    return product


@router.get("/brands")
def get_brands(
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    rows = list_brands(conn)
    if rows:
        return [{"name": r["name"], "slug": r["slug"], "image": ""} for r in rows]

    products = list_products(conn)
    seen: dict[str, str] = {}
    for p in products:
        label = derive_brand_label(p.title)
        if label not in seen:
            seen[label] = p.image
    return [{"name": name, "slug": name.lower().replace(" ", "-"), "image": image} for name, image in seen.items()]


@router.get("/series")
def get_series(
    brand: Annotated[str, Query(description="品牌 slug")],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    return list_series(conn, brand)


@router.get("/styles")
def get_styles(
    brand: Annotated[str, Query(description="品牌 slug")],
    series: Annotated[str, Query(description="系列 slug")],
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> list[dict]:
    return list_styles(conn, brand, series)
