"""Build KOCA-based demo marketplace specs (200 listings, IP coverage, market prices)."""

from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Any

from catalog_seed_lib import load_showcase, parse_price

DEMO_MARKER = "[demo]"

DEMO_USERS: list[tuple[str, str]] = [
    ("user1@test.com", "Yu"),
    ("user2@test.com", "Mina_Lab"),
    ("user3@test.com", "潮流收藏家_Ken"),
    ("user4@test.com", "潮玩小舖_Amy"),
    ("user5@test.com", "盲盒獵人_Leo"),
]

LISTING_COUNT = 200

_TRADE_MODES = ("sell", "sell", "sell", "swap", "swap")
_CONDITIONS = ("sealed", "sealed", "opened", "sealed")


def _market_avg_cents(raw: dict[str, Any]) -> int | None:
    mp = raw.get("marketPrice")
    if not isinstance(mp, dict):
        return None
    avg = mp.get("avg")
    if avg is None:
        return None
    try:
        return int(round(float(avg) * 100))
    except (TypeError, ValueError):
        return None


def _fallback_price_cents(raw: dict[str, Any]) -> int | None:
    amount, _ = parse_price(str(raw.get("price", "")))
    return amount


def _price_cents(raw: dict[str, Any]) -> int | None:
    return _market_avg_cents(raw) or _fallback_price_cents(raw)


def pick_listing_products(
    showcase: dict[str, Any],
    *,
    count: int = LISTING_COUNT,
    rng: random.Random | None = None,
) -> list[dict[str, Any]]:
    """Round-robin across IPs; prefer rows with KOCA marketPrice.avg."""
    rng = rng or random.Random(42)
    with_market: dict[str, list[dict[str, Any]]] = defaultdict(list)
    without_market: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for raw in showcase.get("products", []):
        if not str(raw.get("id", "")).strip() or not str(raw.get("title", "")).strip():
            continue
        if _price_cents(raw) is None:
            continue
        ip = str(raw.get("ip") or "其他 IP").strip() or "其他 IP"
        bucket = with_market if _market_avg_cents(raw) is not None else without_market
        bucket[ip].append(raw)

    ips = sorted(set(with_market) | set(without_market))
    if not ips:
        return []

    for pool in (with_market, without_market):
        for ip in pool:
            rng.shuffle(pool[ip])

    picked: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    def _take(pool: dict[str, list[dict[str, Any]]], ip: str) -> bool:
        while pool[ip]:
            raw = pool[ip].pop(0)
            ext = str(raw["id"])
            if ext in seen_ids:
                continue
            seen_ids.add(ext)
            picked.append(raw)
            return True
        return False

    while len(picked) < count:
        progressed = False
        for ip in ips:
            if len(picked) >= count:
                break
            if _take(with_market, ip):
                progressed = True
        if not progressed:
            break

    while len(picked) < count:
        progressed = False
        for ip in ips:
            if len(picked) >= count:
                break
            if _take(without_market, ip):
                progressed = True
        if not progressed:
            break

    return picked[:count]


def build_listing_specs(
    products: list[dict[str, Any]],
) -> list[tuple[str, str, str, str, bool, int]]:
    """(seller_email, external_id, trade_mode, condition, allow_swap, price_twd_cents)"""
    specs: list[tuple[str, str, str, str, bool, int]] = []
    for i, raw in enumerate(products):
        email = DEMO_USERS[i % len(DEMO_USERS)][0]
        ext_id = str(raw["id"])
        trade_mode = _TRADE_MODES[i % len(_TRADE_MODES)]
        condition = _CONDITIONS[i % len(_CONDITIONS)]
        allow_swap = trade_mode == "swap"
        cents = _price_cents(raw) or 0
        if trade_mode == "swap" and i % 7 == 0:
            cents = 0
        specs.append((email, ext_id, trade_mode, condition, allow_swap, cents))
    return specs


def build_order_specs(
    listing_specs: list[tuple[str, str, str, str, bool, int]],
    *,
    max_orders: int = 8,
) -> list[tuple[str, str, str, str]]:
    sell_rows = [s for s in listing_specs if s[2] == "sell" and s[5] > 0]
    if len(sell_rows) < 2:
        return []
    statuses = (
        "pending_payment",
        "paid",
        "shipped",
        "completed",
        "completed",
        "paid",
        "shipped",
        "pending_payment",
    )
    buyers = [u[0] for u in DEMO_USERS]
    orders: list[tuple[str, str, str, str]] = []
    for i, row in enumerate(sell_rows[:max_orders]):
        seller_email, ext_id = row[0], row[1]
        buyer_email = buyers[(i + 1) % len(buyers)]
        if buyer_email == seller_email:
            buyer_email = buyers[(i + 2) % len(buyers)]
        orders.append(
            (buyer_email, seller_email, ext_id, statuses[i % len(statuses)])
        )
    return orders


def build_cart_specs(
    order_specs: list[tuple[str, str, str, str]],
) -> list[tuple[str, str, str]]:
    """(buyer_email, seller_email, listing_external_id)."""
    out: list[tuple[str, str, str]] = []
    for buyer, seller, ext_id, status in order_specs[:3]:
        if status in ("pending_payment", "paid"):
            out.append((buyer, seller, ext_id))
    return out


def build_chat_specs(
    listing_specs: list[tuple[str, str, str, str, bool, int]],
) -> list[tuple[str, str, str, str, str]]:
    swap_rows = [s for s in listing_specs if s[2] == "swap"][:2]
    chats: list[tuple[str, str, str, str, str]] = []
    participants = [u[0] for u in DEMO_USERS]
    for i, (seller_email, ext_id, *_rest) in enumerate(swap_rows):
        p1 = participants[i % len(participants)]
        p2 = participants[(i + 1) % len(participants)]
        if p1 == seller_email:
            p2 = participants[(i + 2) % len(participants)]
        if p2 == seller_email:
            p2 = participants[(i + 3) % len(participants)]
        status = "swapping" if i == 0 else "pending_payment"
        chats.append((p1, p2, seller_email, ext_id, status))
    return chats


def build_collection_specs(
    listing_specs: list[tuple[str, str, str, str, bool, int]],
    *,
    count: int = 36,
) -> list[tuple[str, str, str]]:
    specs: list[tuple[str, str, str]] = []
    for i, (email, ext_id, *_rest) in enumerate(listing_specs[:count]):
        ctype = "collected" if i % 3 != 0 else "wishlist"
        specs.append((email, ext_id, ctype))
    return specs


def build_koca_demo_bundle(
    json_path: Path,
    *,
    listing_count: int = LISTING_COUNT,
) -> dict[str, Any]:
    showcase = load_showcase(json_path)
    products = pick_listing_products(showcase, count=listing_count)
    listing_specs = build_listing_specs(products)
    order_specs = build_order_specs(listing_specs)
    ips = {str(p.get("ip") or "?") for p in products}
    with_mp = sum(1 for p in products if _market_avg_cents(p) is not None)
    return {
        "listing_specs": listing_specs,
        "order_specs": order_specs,
        "cart_specs": build_cart_specs(order_specs),
        "chat_specs": build_chat_specs(listing_specs),
        "collection_specs": build_collection_specs(listing_specs),
        "meta": {
            "products_picked": len(products),
            "ips_covered": len(ips),
            "with_market_price": with_mp,
        },
    }


def load_bundle_from_path(json_path: Path) -> dict[str, Any]:
    return build_koca_demo_bundle(json_path)
