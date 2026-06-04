"""圖鑑分組：品牌 → 產品線系列（derive_series_name）→ IP 歸屬（系列級，多 IP → 其他 IP）"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from domain.ip_rules import FALLBACK_IP
from domain.series_rules import derive_series_name, slugify_label

OTHER_IP = FALLBACK_IP


@dataclass(frozen=True)
class GroupedProduct:
    external_id: str
    title: str
    brand_slug: str
    brand_name: str
    line_name: str
    line_slug: str
    koca_ip: str
    image_url: str | None = None


@dataclass(frozen=True)
class SeriesGroup:
    brand_slug: str
    brand_name: str
    line_name: str
    line_slug: str
    ip_name: str
    ip_slug: str
    product_count: int
    koca_ips_seen: frozenset[str]
    external_ids: frozenset[str]


def koca_ip_from_raw(raw: dict[str, Any], *, title: str = "") -> str:
    explicit = str(raw.get("ip") or "").strip()
    if explicit:
        return explicit
    return OTHER_IP


def assign_series_ip(koca_ips: set[str]) -> str:
    normalized = {ip.strip() for ip in koca_ips if ip and ip.strip()}
    if len(normalized) > 1:
        return OTHER_IP
    if len(normalized) == 1:
        return next(iter(normalized))
    return OTHER_IP


def line_slug_and_name(line_name: str) -> tuple[str, str]:
    name = (line_name or "").strip() or derive_series_name("")
    return slugify_label(name), name


# 與 catalog_seed_lib.IP_SLUGS 對齊
_IP_SLUGS: dict[str, tuple[str, str]] = {
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
    OTHER_IP: ("other-ip", OTHER_IP),
}


def ip_slug_and_name(ip_name: str) -> tuple[str, str]:
    label = (ip_name or "").strip() or OTHER_IP
    if label in _IP_SLUGS:
        return _IP_SLUGS[label]
    return slugify_label(label), label


def build_grouped_products(
    rows: list[dict[str, Any]],
    *,
    brand_slug: str,
    brand_name: str,
    line_key: str = "title",
) -> list[GroupedProduct]:
    out: list[GroupedProduct] = []
    for raw in rows:
        title = str(raw.get(line_key) or raw.get("title") or "").strip()
        external_id = str(raw.get("external_id") or raw.get("id") or "").strip()
        if not title or not external_id:
            continue
        line_name = derive_series_name(title)
        line_slug, _ = line_slug_and_name(line_name)
        out.append(
            GroupedProduct(
                external_id=external_id,
                title=title,
                brand_slug=brand_slug,
                brand_name=brand_name,
                line_name=line_name,
                line_slug=line_slug,
                koca_ip=koca_ip_from_raw(raw, title=title),
                image_url=(raw.get("image_url") or raw.get("image") or None),
            )
        )
    return out


def build_series_groups(products: list[GroupedProduct]) -> list[SeriesGroup]:
    # 分組 key 用 line_name（穩定語意）；line_slug 僅供 DB UNIQUE，由名稱推導
    buckets: dict[tuple[str, str], list[GroupedProduct]] = defaultdict(list)
    for p in products:
        buckets[(p.brand_slug, p.line_name)].append(p)

    groups: list[SeriesGroup] = []
    for (brand_slug, line_name), members in buckets.items():
        koca_ips = {m.koca_ip for m in members}
        ip_name = assign_series_ip(koca_ips)
        ip_slug, ip_display = ip_slug_and_name(ip_name)
        line_slug, line_display = line_slug_and_name(line_name)
        groups.append(
            SeriesGroup(
                brand_slug=brand_slug,
                brand_name=members[0].brand_name,
                line_name=line_display,
                line_slug=line_slug,
                ip_name=ip_display,
                ip_slug=ip_slug,
                product_count=len(members),
                koca_ips_seen=frozenset(koca_ips),
                external_ids=frozenset(m.external_id for m in members),
            )
        )
    groups.sort(key=lambda g: (-g.product_count, g.brand_slug, g.line_name))
    return groups


def grouping_summary(groups: list[SeriesGroup]) -> dict[str, int | list[dict[str, Any]]]:
    multi_ip = [g for g in groups if len(g.koca_ips_seen) > 1]
    return {
        "series_count": len(groups),
        "product_count": sum(g.product_count for g in groups),
        "multi_ip_series_count": len(multi_ip),
        "multi_ip_series": [
            {
                "brand": g.brand_slug,
                "line": g.line_name,
                "assigned_ip": g.ip_name,
                "koca_ips": sorted(g.koca_ips_seen),
                "products": g.product_count,
            }
            for g in multi_ip[:50]
        ],
    }
