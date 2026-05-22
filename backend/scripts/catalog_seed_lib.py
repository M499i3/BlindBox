"""從 popmart-hk-showcase.json 解析圖鑑種子資料（與前端 CatalogService 規則對齊）"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


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
    series_name: str
    series_slug: str


BRAND_SLUGS: dict[str, tuple[str, str]] = {
    "SKULLPANDA": ("skullpanda", "SKULLPANDA"),
    "PUCKY": ("pucky", "PUCKY"),
    "DIMOO": ("dimoo", "Dimoo"),
    "MOLLY": ("molly", "Molly"),
    "LABUBU": ("labubu", "LABUBU"),
    "CHAKA": ("chaka", "CHAKA"),
    "Pop Mart": ("popmart", "Pop Mart"),
}


def derive_brand_label(title: str) -> str:
    u = title.upper()
    if "SKULLPANDA" in u:
        return "SKULLPANDA"
    if "PUCKY" in u:
        return "PUCKY"
    if "DIMOO" in u:
        return "Dimoo"
    if "MOLLY" in u:
        return "Molly"
    if "LABUBU" in u:
        return "LABUBU"
    if "CHAKA" in u:
        return "CHAKA"
    if "泡泡" in title:
        return "Pop Mart"
    return "Pop Mart"


def brand_slug_and_name(label: str) -> tuple[str, str]:
    if label in BRAND_SLUGS:
        return BRAND_SLUGS[label]
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "other"
    return slug, label


def extract_series_name(title: str, brand_label: str) -> str:
    m = re.search(r"(.+?系列)", title)
    if m:
        return m.group(1).strip()
    return f"{brand_label} 精選"


def stable_series_slug(brand_slug: str, series_name: str) -> str:
    digest = hashlib.sha1(f"{brand_slug}:{series_name}".encode("utf-8")).hexdigest()[:12]
    return f"{brand_slug}-{digest}"


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
    currency = "HKD"
    if re.search(r"NT\$|TWD", price, re.I):
        currency = "TWD"
    elif re.search(r"¥|CNY", price, re.I):
        currency = "CNY"
    return int(round(major * 100)), currency


def load_showcase(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def build_seed_products(showcase: dict[str, Any]) -> list[SeedProduct]:
    products: list[SeedProduct] = []
    for raw in showcase.get("products", []):
        title = str(raw.get("title", "")).strip()
        external_id = str(raw.get("id", "")).strip()
        if not title or not external_id:
            continue

        brand_label = derive_brand_label(title)
        brand_slug, brand_name = brand_slug_and_name(brand_label)
        series_name = extract_series_name(title, brand_label)
        series_slug = stable_series_slug(brand_slug, series_name)
        amount, currency = parse_price(str(raw.get("price", "")))

        products.append(
            SeedProduct(
                external_id=external_id,
                title=title,
                price_amount=amount,
                price_currency=currency,
                image_url=(raw.get("image") or None),
                source_url=(raw.get("sourceUrl") or None),
                is_secret="隱藏" in title or "secret" in title.lower(),
                brand_name=brand_name,
                brand_slug=brand_slug,
                series_name=series_name,
                series_slug=series_slug,
            )
        )
    return products
