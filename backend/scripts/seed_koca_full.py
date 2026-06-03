#!/usr/bin/env python3
"""
Replace catalog + marketplace with KOCA data, then seed 200 demo listings (full demo).

Keeps existing users; upserts 5 demo accounts (password: password).

用法（專案根目錄）：
  npm run db:seed:koca:full
  python3 backend/scripts/seed_koca_full.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(SCRIPTS_DIR))

KOCA_JSON = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="KOCA 圖鑑全量替換 + 200 筆市集 demo（保留 users）"
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not KOCA_JSON.is_file():
        raise SystemExit(f"找不到 {KOCA_JSON}")

    from koca_demo_lib import build_koca_demo_bundle

    bundle = build_koca_demo_bundle(KOCA_JSON)
    meta = bundle["meta"]
    print(
        f"將建立 {len(bundle['listing_specs'])} 筆 demo 上架，"
        f"涵蓋 {meta['ips_covered']} 個 IP"
        f"（{meta['with_market_price']} 筆含 KOCA marketPrice.avg）"
    )

    if args.dry_run:
        print("[dry-run] 略過資料庫")
        return

    from seed_catalog import run_seed as run_catalog_seed

    run_catalog_seed._replace_catalog = True  # type: ignore[attr-defined]
    run_catalog_seed(KOCA_JSON, dry_run=False, seed_user=False)

    from seed_dev_demo import run_seed as run_demo_seed

    run_demo_seed(dry_run=False, koca_bundle=bundle)


if __name__ == "__main__":
    main()
