#!/usr/bin/env python3
"""
Import KOCA heat metrics and recompute blended catalog heat scores.

用法（專案根目錄）：
  npm run db:refresh-heat
  python3 backend/scripts/refresh_catalog_heat.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT / "src"))

KOCA_JSON = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"


def _pg_url() -> str:
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh KOCA + monthly catalog heat metrics")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--json",
        type=Path,
        default=KOCA_JSON,
        help=f"KOCA showcase JSON (default: {KOCA_JSON.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--compute-only",
        action="store_true",
        help="只重算本站月指标与混合 heat_score，不导入 KOCA",
    )
    args = parser.parse_args()

    if args.compute_only:
        if args.dry_run:
            print("[dry-run] 将重算 catalog heat（月成交 / 想收 + 混合分）")
            return
        import psycopg2
        from psycopg2.extras import RealDictCursor

        from application.catalog_heat_service import compute_catalog_heat

        conn = psycopg2.connect(_pg_url(), cursor_factory=RealDictCursor)
        try:
            computed = compute_catalog_heat(conn)
            print(f"✅ 重算 heat {computed} 筆")
        finally:
            conn.close()
        return

    if not args.json.is_file():
        raise SystemExit(f"找不到 {args.json}")

    sys.path.insert(0, str(BACKEND_ROOT / "scripts"))
    from catalog_seed_lib import is_koca_blind_box_product  # noqa: E402

    data = json.loads(args.json.read_text(encoding="utf-8"))
    products = [
        p for p in (data.get("products") or []) if is_koca_blind_box_product(p)
    ]
    if not products:
        raise SystemExit(f"{args.json} 無 gatcha_goods 盲盒商品")

    if args.dry_run:
        print(f"[dry-run] 將匯入 {len(products)} 筆 KOCA 盲盒指標並重算 heat_score")
        return

    import psycopg2
    from psycopg2.extras import RealDictCursor

    from application.catalog_heat_service import compute_catalog_heat, import_koca_metrics

    conn = psycopg2.connect(_pg_url(), cursor_factory=RealDictCursor)
    try:
        imported = import_koca_metrics(conn, products)
        computed = compute_catalog_heat(conn)
        print(f"✅ KOCA 指標匯入 {imported} 筆；重算 heat {computed} 筆")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
