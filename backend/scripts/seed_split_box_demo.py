#!/usr/bin/env python3
"""
Seed demo 拆盒團 into Supabase using KOCA catalog lines with <15 款式 per 系列.

Requires: catalog seeded (npm run db:seed:koca) and demo users (user1–user5).

用法：
  npm run db:seed:split-box
  npm run db:seed:split-box -- --dry-run
"""

from __future__ import annotations

import argparse
import random
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(BACKEND_ROOT / "src"))

KOCA_JSON = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"
MAX_STYLES_PER_LINE = 15
MIN_STYLES_PER_LINE = 3
GROUP_COUNT = 3
BRAND_NAME = "Pop Mart"


def _derive_product_line(title: str) -> str:
    cleaned = re.sub(r"^泡泡萌粒\s*", "", title or "")
    cleaned = re.sub(
        r"(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$", "", cleaned
    ).strip()
    m = re.search(
        r"([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)", cleaned
    )
    return m.group(1).strip() if m else "未分系列"


def _price_cents(raw: dict) -> int:
    mp = raw.get("marketPrice")
    if isinstance(mp, dict) and mp.get("avg") is not None:
        try:
            return int(round(float(mp["avg"]) * 100))
        except (TypeError, ValueError):
            pass
    price = str(raw.get("price") or "")
    digits = re.sub(r"[^0-9.]", "", price)
    if not digits:
        return 9900
    return int(round(float(digits) * 100))


def _load_product_lines() -> list[tuple[str, str, list[dict]]]:
    import json

    data = json.loads(KOCA_JSON.read_text(encoding="utf-8"))
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for raw in data.get("products", []):
        pid = str(raw.get("id") or "").strip()
        title = str(raw.get("title") or "").strip()
        if not pid or not title:
            continue
        ip = str(raw.get("ip") or "其他 IP").strip() or "其他 IP"
        line = _derive_product_line(title)
        buckets[(ip, line)].append(raw)

    eligible = [
        (ip, line, prods)
        for (ip, line), prods in buckets.items()
        if MIN_STYLES_PER_LINE <= len(prods) < MAX_STYLES_PER_LINE
    ]
    eligible.sort(key=lambda x: (len(x[2]), x[0], x[1]))
    return eligible


def _pick_lines(
    eligible: list[tuple[str, str, list[dict]]], count: int
) -> list[tuple[str, str, list[dict]]]:
    """Prefer 4–8 款式; one line per IP; avoid duplicate 系列名 when possible."""
    preferred = [e for e in eligible if 4 <= len(e[2]) <= 8]
    fallback = [e for e in eligible if e not in preferred]
    pool = preferred + fallback

    picked: list[tuple[str, str, list[dict]]] = []
    seen_ips: set[str] = set()
    seen_lines: set[str] = set()

    def try_add(batch: list[tuple[str, str, list[dict]]], *, allow_dup_line: bool) -> None:
        for ip, line, prods in batch:
            if len(picked) >= count:
                return
            if ip in seen_ips:
                continue
            if not allow_dup_line and line in seen_lines:
                continue
            seen_ips.add(ip)
            seen_lines.add(line)
            picked.append((ip, line, prods))

    try_add(pool, allow_dup_line=False)
    try_add(pool, allow_dup_line=True)
    return picked[:count]


def _pg_conn():
    import psycopg2
    from psycopg2.extras import RealDictCursor

    from infrastructure.db.config import get_database_url

    url = get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)
    return psycopg2.connect(url, cursor_factory=RealDictCursor)


def _user_id_by_email(cur, email: str) -> str:
    cur.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"找不到使用者 {email}，請先執行 db:seed:koca:full 或 db:seed:demo")
    return str(row["id"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo 拆盒團（系列 <15 款）")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--count", type=int, default=GROUP_COUNT)
    args = parser.parse_args()

    if not KOCA_JSON.is_file():
        raise SystemExit(f"找不到 {KOCA_JSON}")

    eligible = _load_product_lines()
    picks = _pick_lines(eligible, args.count)
    if not picks:
        raise SystemExit("找不到符合條件（3–14 款）的系列，請確認 KOCA 圖鑑 JSON")

    organizers = [
        "user1@test.com",
        "user4@test.com",
        "user5@test.com",
    ]

    print(f"將建立 {len(picks)} 個拆盒團（每團系列 <{MAX_STYLES_PER_LINE} 款）：")
    for (ip, line, prods), org in zip(picks, organizers):
        print(f"  · {ip} / {line} — {len(prods)} 款 — 團主 {org}")

    if args.dry_run:
        print("[dry-run] 略過資料庫")
        return

    from domain.entities import CreateSplitBoxInput, SplitBoxSlotInput
    from infrastructure.db.repositories.split_box_repository import (
        claim_split_box_slot,
        create_split_box_group,
    )

    rng = random.Random(42)
    conn = _pg_conn()
    created_ids: list[str] = []

    try:
        with conn.cursor() as cur:
            org_ids = {email: _user_id_by_email(cur, email) for email in organizers}
            claimer_id = _user_id_by_email(cur, "user2@test.com")

        for idx, ((ip, line, prods), org_email) in enumerate(zip(picks, organizers)):
            organizer_id = org_ids[org_email]
            prods = sorted(prods, key=lambda p: str(p.get("title") or ""))
            reserve_n = 1 if len(prods) >= 4 else 0
            reserved_idxs = set(rng.sample(range(len(prods)), reserve_n)) if reserve_n else set()

            total_cents = sum(_price_cents(p) for p in prods)
            slots = [
                SplitBoxSlotInput(
                    catalog_product_id=str(p["id"]),
                    product_title=str(p["title"]),
                    product_image=str(p.get("image") or "") or None,
                    reserved_by_host=i in reserved_idxs,
                )
                for i, p in enumerate(prods)
            ]

            closes = (datetime.now(timezone.utc) + timedelta(days=7 + idx)).isoformat()
            title = f"{line} 拆盒團"
            if ip not in line and line != "未分系列":
                title = f"{ip} {line} 拆盒團"

            data = CreateSplitBoxInput(
                title=title,
                brand=BRAND_NAME,
                series=ip,
                description=f"[demo] 示範拆盒團 · {ip} · {line} · 共 {len(prods)} 款",
                cover_image=str(prods[0].get("image") or "") or None,
                shipping="7-11 店到店",
                total_price=f"NT$ {total_cents // 100}",
                closes_at=closes,
                slots=slots,
            )

            detail = create_split_box_group(conn, organizer_id, data)
            created_ids.append(detail.id)
            print(f"✅ {detail.title} → {detail.id} ({len(prods)} 款)")

            if idx == 0:
                available = [
                    s for s in detail.slots if s.status == "available" and not s.reserved_by_host
                ]
                if available:
                    claim_split_box_slot(conn, claimer_id, detail.id, available[0].id)
                    print(f"   ↳ user2 已認領 1 款：{available[0].product_title}")

        conn.commit()
        print("\n完成。首頁 → 交易方式 → 拆 可看到拆盒團。")
        print("團詳情路徑範例：")
        for gid in created_ids:
            print(f"  /split-box/{gid}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
