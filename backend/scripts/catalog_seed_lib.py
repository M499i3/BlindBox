"""從 KOCA showcase JSON 解析圖鑑種子：品牌 → 產品線系列 → IP（系列級）→ 款式。"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

BACKEND_SRC = Path(__file__).resolve().parents[1] / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

from collections import defaultdict

from domain.catalog_grouping import (  # noqa: E402
    build_grouped_products,
    build_series_groups,
)

KOCA_SHOWCASE_SOURCE = "koca"
KOCA_BLIND_BOX_TYPE_ID = "gatcha_goods"

POPMART_BRAND = ("pop-mart", "Pop Mart")
JELLYCAT_BRAND = ("jellycat", "Jellycat")


@dataclass(frozen=True)
class SeedProduct:
    external_id: str
    title: str
    price_amount: int | None
    price_currency: str | None
    image_url: str | None
    source_url: str | None
    is_secret: bool
    brand_name: str
    brand_slug: str
    ip_name: str
    ip_slug: str
    line_name: str
    line_slug: str


def manufacturer_for_title(title: str) -> tuple[str, str]:
    if re.search(r"jellycat", title, re.I):
        return JELLYCAT_BRAND
    return POPMART_BRAND


def _price_from_raw(raw: dict[str, Any]) -> tuple[int | None, str | None]:
    mp = raw.get("marketPrice")
    if isinstance(mp, dict) and mp.get("avg") is not None:
        try:
            major = float(mp["avg"])
        except (TypeError, ValueError):
            major = None
        if major is not None:
            currency = str(mp.get("currency") or "TWD").upper()
            return int(round(major * 100)), currency
    return parse_price(str(raw.get("price", "")))


def parse_price(price: str) -> tuple[int | None, str | None]:
    if not price or not str(price).strip():
        return None, None
    digits = re.sub(r"[^\d.]", "", str(price))
    if not digits:
        return None, None
    try:
        major = float(digits)
    except ValueError:
        return None, None
    currency = "TWD"
    if re.search(r"HK\$|HKD", price, re.I):
        currency = "HKD"
    elif re.search(r"¥|CNY", price, re.I):
        currency = "CNY"
    return int(round(major * 100)), currency


def load_showcase(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def assert_koca_showcase(showcase: dict[str, Any]) -> None:
    source = str(showcase.get("source") or "").strip()
    if source != KOCA_SHOWCASE_SOURCE:
        raise ValueError(
            f"圖鑑種子僅支援 KOCA（source={source!r}，預期 {KOCA_SHOWCASE_SOURCE!r}）"
        )


def is_koca_blind_box_product(raw: dict[str, Any]) -> bool:
    return str(raw.get("typeId") or "").strip() == KOCA_BLIND_BOX_TYPE_ID


def summarize_koca_showcase(showcase: dict[str, Any]) -> dict[str, int]:
    assert_koca_showcase(showcase)
    raw_products = showcase.get("products") or []
    blind = sum(1 for r in raw_products if is_koca_blind_box_product(r))
    return {
        "raw_total": len(raw_products),
        "blind_box": blind,
        "skipped_other_type": len(raw_products) - blind,
    }


def build_seed_products(showcase: dict[str, Any]) -> list[SeedProduct]:
    assert_koca_showcase(showcase)
    rows: list[dict[str, Any]] = []
    for raw in showcase.get("products", []):
        if not is_koca_blind_box_product(raw):
            continue
        title = str(raw.get("title", "")).strip()
        external_id = str(raw.get("id", "")).strip()
        if not title or not external_id:
            continue
        brand_slug, brand_name = manufacturer_for_title(title)
        amount, currency = _price_from_raw(raw)
        raw_secret = raw.get("isSecret", raw.get("is_secret"))
        rows.append(
            {
                "id": external_id,
                "title": title,
                "ip": raw.get("ip"),
                "image": raw.get("image"),
                "sourceUrl": raw.get("sourceUrl"),
                "price_amount": amount,
                "price_currency": currency,
                "is_secret": bool(raw_secret),
                "brand_slug": brand_slug,
                "brand_name": brand_name,
            }
        )

    by_brand: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for raw in rows:
        by_brand[str(raw["brand_slug"])].append(raw)

    all_grouped = []
    for brand_slug, brand_rows in by_brand.items():
        bn = str(brand_rows[0]["brand_name"])
        all_grouped.extend(
            build_grouped_products(brand_rows, brand_slug=brand_slug, brand_name=bn)
        )

    groups = build_series_groups(all_grouped)
    ext_to_group = {eid: g for g in groups for eid in g.external_ids}

    products: list[SeedProduct] = []
    for raw in rows:
        eid = str(raw["id"])
        g = ext_to_group.get(eid)
        if not g:
            continue
        products.append(
            SeedProduct(
                external_id=eid,
                title=str(raw["title"]),
                price_amount=raw.get("price_amount"),
                price_currency=raw.get("price_currency"),
                image_url=raw.get("image"),
                source_url=raw.get("sourceUrl"),
                is_secret=bool(raw.get("is_secret")),
                brand_name=g.brand_name,
                brand_slug=g.brand_slug,
                ip_name=g.ip_name,
                ip_slug=g.ip_slug,
                line_name=g.line_name,
                line_slug=g.line_slug,
            )
        )
    return products
