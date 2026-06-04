"""從 showcase JSON 解析圖鑑種子：品牌（廠牌）→ 系列（IP）→ 商品"""

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

from domain.ip_rules import derive_ip_label  # noqa: E402

# 廠牌 / 製造商（Explore 頂層：Pop Mart、Jellycat）
POPMART_BRAND = ("pop-mart", "Pop Mart")
JELLYCAT_BRAND = ("jellycat", "Jellycat")

# IP（DB series 層；對齊 frontend catalogHierarchy 的 IpNode）
IP_SLUGS: dict[str, tuple[str, str]] = {
    "LABUBU": ("labubu", "LABUBU"),
    "SKULLPANDA": ("skullpanda", "SKULLPANDA"),
    "CRYBABY": ("crybaby", "CRYBABY"),
    "星星人": ("twinkle-twinkle", "星星人"),
    "Hirono": ("hirono", "Hirono"),
    "Zsiga": ("zsiga", "Zsiga"),
    "PINO JELLY": ("pino-jelly", "PINO JELLY"),
    "HACIPUPU": ("hacipupu", "HACIPUPU"),
    "PUCKY": ("pucky", "PUCKY"),
    "Dimoo": ("dimoo", "Dimoo"),
    "Molly": ("molly", "Molly"),
    "Baby Molly": ("baby-molly", "Baby Molly"),
    "CHAKA": ("chaka", "CHAKA"),
    "小甜豆": ("sweet-bean", "小甜豆"),
    "迪士尼": ("disney", "迪士尼"),
    "KUBO": ("kubo", "KUBO"),
    "SpongeBob": ("spongebob", "SpongeBob"),
    "POLAR": ("polar", "POLAR"),
    "其他 IP": ("other-ip", "其他 IP"),
}


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


def manufacturer_for_title(title: str) -> tuple[str, str]:
    if re.search(r"jellycat", title, re.I):
        return JELLYCAT_BRAND
    return POPMART_BRAND


def ip_slug_and_name(label: str) -> tuple[str, str]:
    if label in IP_SLUGS:
        return IP_SLUGS[label]
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "other-ip"
    return slug, label


def ip_label_from_raw(raw: dict[str, Any], title: str) -> str:
    explicit = str(raw.get("ip") or "").strip()
    if explicit:
        return explicit
    return derive_ip_label(title)


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


def build_seed_products(showcase: dict[str, Any]) -> list[SeedProduct]:
    products: list[SeedProduct] = []
    for raw in showcase.get("products", []):
        title = str(raw.get("title", "")).strip()
        external_id = str(raw.get("id", "")).strip()
        if not title or not external_id:
            continue

        brand_slug, brand_name = manufacturer_for_title(title)
        ip_label = ip_label_from_raw(raw, title)
        series_slug, series_name = ip_slug_and_name(ip_label)
        amount, currency = _price_from_raw(raw)

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
