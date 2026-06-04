#!/usr/bin/env python3
"""
將 KOCA 盲盒圖鑑（frontend/data/koca-popmart-showcase.json）匯入 PostgreSQL。

僅匯入 typeId === gatcha_goods；不支援 popmart-hk-showcase。

需已執行 alembic upgrade head。支援冪等 upsert（external_id / slug）。

用法（專案根目錄）：
  npm run db:seed
  npm run db:seed:replace          # 先清空圖鑑與市集再匯入（建議首次篩盲盒後使用）
  npm run db:seed:dry

  python3 backend/scripts/seed_catalog.py
  python3 backend/scripts/seed_catalog.py --replace --no-dev-user
  python3 backend/scripts/seed_catalog.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(SCRIPTS_DIR))

from catalog_seed_lib import (  # noqa: E402
    build_seed_products,
    load_showcase,
    summarize_koca_showcase,
)
from catalog_seed_ops import seed_catalog_on_cursor  # noqa: E402
from marketplace_purge_lib import purge_catalog_and_marketplace  # noqa: E402

KOCA_JSON = REPO_ROOT / "frontend" / "data" / "koca-popmart-showcase.json"
IP_IMAGES_JSON = REPO_ROOT / "frontend" / "data" / "popmart-hk-ip-images.json"
DEV_USER_EMAIL = "user1@test.com"
DEV_USER_NAME = "Yu"


def load_ip_cover_by_slug() -> dict[str, str]:
    if not IP_IMAGES_JSON.is_file():
        return {}
    data = json.loads(IP_IMAGES_JSON.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for ip in data.get("ips", []):
        slug = str(ip.get("slug") or "").strip()
        image = str(ip.get("image") or "").strip()
        if slug and image:
            out[slug] = image
    return out


def _pg_url() -> str:
    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def upsert_brand(cur, slug: str, name: str, logo_url: str | None) -> str:
    cur.execute(
        """
        INSERT INTO brands (slug, name, logo_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
            updated_at = now()
        RETURNING id
        """,
        (slug, name, logo_url),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def upsert_series(
    cur, brand_id: str, slug: str, name: str, cover_url: str | None
) -> str:
    cur.execute(
        """
        INSERT INTO series (brand_id, slug, name, cover_url, total_count)
        VALUES (%s, %s, %s, %s, 0)
        ON CONFLICT (brand_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            cover_url = COALESCE(EXCLUDED.cover_url, series.cover_url),
            updated_at = now()
        RETURNING id
        """,
        (brand_id, slug, name, cover_url),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def upsert_catalog_product(cur, product: SeedProduct, series_id: str) -> None:
    cur.execute(
        """
        INSERT INTO catalog_products (
            external_id,
            series_id,
            title,
            official_price_amount,
            official_price_currency,
            image_url,
            source_url,
            is_secret
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (external_id) DO UPDATE SET
            series_id = EXCLUDED.series_id,
            title = EXCLUDED.title,
            official_price_amount = EXCLUDED.official_price_amount,
            official_price_currency = EXCLUDED.official_price_currency,
            image_url = EXCLUDED.image_url,
            source_url = EXCLUDED.source_url,
            is_secret = EXCLUDED.is_secret,
            updated_at = now()
        """,
        (
            product.external_id,
            series_id,
            product.title,
            product.price_amount,
            product.price_currency,
            product.image_url,
            product.source_url,
            product.is_secret,
        ),
    )


def prune_catalog_products_not_in_seed(cur, external_ids: set[str]) -> int:
    """刪除不在本次種子集合的圖鑑商品（清除舊 popmart-hk / 非盲盒殘留）。"""
    if not external_ids:
        return 0
    cur.execute(
        """
        DELETE FROM catalog_products
        WHERE external_id IS NULL
           OR NOT (external_id = ANY(%s::text[]))
        """,
        (list(external_ids),),
    )
    return cur.rowcount


def prune_orphan_series_and_brands(cur) -> tuple[int, int, int]:
    cur.execute(
        """
        DELETE FROM series s
        WHERE NOT EXISTS (
            SELECT 1 FROM catalog_products cp WHERE cp.series_id = s.id
        )
        """
    )
    series_deleted = cur.rowcount
    cur.execute(
        """
        DELETE FROM ips i
        WHERE NOT EXISTS (
            SELECT 1 FROM catalog_products cp WHERE cp.ip_id = i.id
        )
        AND NOT EXISTS (
            SELECT 1 FROM series s WHERE s.ip_id = i.id
        )
        """
    )
    ips_deleted = cur.rowcount
    cur.execute(
        """
        DELETE FROM brands b
        WHERE NOT EXISTS (SELECT 1 FROM ips i WHERE i.brand_id = b.id)
        """
    )
    brands_deleted = cur.rowcount
    return series_deleted, ips_deleted, brands_deleted


def refresh_series_counts(cur) -> int:
    cur.execute(
        """
        UPDATE series s
        SET total_count = COALESCE(sub.cnt, 0),
            updated_at = now()
        FROM (
            SELECT series_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE series_id IS NOT NULL
            GROUP BY series_id
        ) sub
        WHERE s.id = sub.series_id
        """
    )
    updated = cur.rowcount
    cur.execute(
        """
        UPDATE series s
        SET total_count = 0, updated_at = now()
        WHERE NOT EXISTS (
            SELECT 1 FROM catalog_products cp WHERE cp.series_id = s.id
        )
        """
    )
    return updated


def seed_dev_user(cur) -> str:
    from auth_util import hash_password

    cur.execute(
        """
        INSERT INTO users (display_name, email, password_hash)
        VALUES (%s, %s, %s)
        ON CONFLICT (email) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            password_hash = EXCLUDED.password_hash,
            updated_at = now()
        RETURNING id
        """,
        (DEV_USER_NAME, DEV_USER_EMAIL, hash_password()),
    )
    row = cur.fetchone()
    assert row
    return str(row["id"])


def refresh_catalog_metrics_from_koca(json_path: Path) -> tuple[int, int]:
    """圖鑑重種後依 KOCA JSON 重建 catalog_product_metrics（CASCADE 會清空舊列）。"""
    import json

    sys.path.insert(0, str(BACKEND_ROOT / "src"))
    from application.catalog_heat_service import (  # noqa: E402
        compute_catalog_heat,
        import_koca_metrics,
    )
    from catalog_seed_lib import is_koca_blind_box_product  # noqa: E402

    data = json.loads(json_path.read_text(encoding="utf-8"))
    products = [p for p in (data.get("products") or []) if is_koca_blind_box_product(p)]
    if not products:
        return 0, 0

    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(_pg_url(), cursor_factory=RealDictCursor)
    try:
        with conn:
            imported = import_koca_metrics(conn, products)
            computed = compute_catalog_heat(conn)
        return imported, computed
    finally:
        conn.close()


def run_seed(
    json_path: Path,
    *,
    dry_run: bool,
    seed_user: bool,
    replace_catalog: bool,
    prune_stale: bool,
) -> None:
    showcase = load_showcase(json_path)
    stats = summarize_koca_showcase(showcase)
    products = build_seed_products(showcase)
    if not products:
        raise SystemExit(
            f"找不到可匯入的 KOCA 盲盒商品：{json_path} "
            f"（JSON 共 {stats['raw_total']} 筆，"
            f"略過 {stats['skipped_other_type']} 筆非 gatcha_goods）"
        )

    ip_covers = load_ip_cover_by_slug()
    brands_meta = {p.brand_slug for p in products}
    ips_meta = {(p.brand_slug, p.ip_slug) for p in products}
    lines_meta = {(p.brand_slug, p.ip_slug, p.line_slug) for p in products}

    seed_external_ids = {p.external_id for p in products}

    print(f"來源：{json_path}")
    print(
        f"KOCA JSON：{stats['raw_total']} 筆 → "
        f"盲盒 gatcha_goods {stats['blind_box']} 筆 → "
        f"略過其他 typeId {stats['skipped_other_type']} 筆"
    )
    print(
        f"將匯入 {len(products)} 筆 catalog_products、"
        f"{len(brands_meta)} 個品牌、{len(ips_meta)} 個 IP、{len(lines_meta)} 條產品線"
        + (f"（{len(ip_covers)} 個 IP 官圖）" if ip_covers else "")
    )
    if prune_stale and not replace_catalog:
        print("匯入後將刪除不在本次種子內的 catalog_products，並清理空 series / brands")

    if dry_run:
        print("[dry-run] 略過資料庫寫入")
        return

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit(
            "缺少 psycopg2。請執行：cd backend && python3 -m venv .venv && "
            "source .venv/bin/activate && pip install -r requirements.txt"
        ) from e

    conn = psycopg2.connect(_pg_url())
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if replace_catalog:
                    purge_catalog_and_marketplace(cur)

                seed_stats = seed_catalog_on_cursor(cur, products)

                pruned_products = 0
                pruned_series = 0
                pruned_ips = 0
                pruned_brands = 0
                if prune_stale and not replace_catalog:
                    pruned_products = prune_catalog_products_not_in_seed(
                        cur, seed_external_ids
                    )
                    pruned_series, pruned_ips, pruned_brands = (
                        prune_orphan_series_and_brands(cur)
                    )

                updated_series = refresh_series_counts(cur)

                dev_id: str | None = None
                if seed_user:
                    dev_id = seed_dev_user(cur)

        print(f"✅ 完成：{seed_stats['products']} 筆 catalog_products")
        print(
            f"   {seed_stats['brands']} 品牌 / {seed_stats['ips']} IP / "
            f"{seed_stats['series']} 產品線"
        )
        print(f"   已更新 {updated_series} 條產品線、{seed_stats.get('ip_counts_updated', 0)} 個 IP 的 total_count")
        if pruned_products:
            print(f"   已刪除 {pruned_products} 筆不在種子內的舊圖鑑商品")
        if pruned_series or pruned_ips or pruned_brands:
            print(
                f"   已清理空產品線 {pruned_series}、IP {pruned_ips}、品牌 {pruned_brands}"
            )
        if dev_id:
            print(f"   開發用使用者：{DEV_USER_NAME} ({dev_id})")
            print(f"   可加入 .env：VITE_DEV_USER_ID={dev_id}")

        if json_path == KOCA_JSON or str(json_path).endswith("koca-popmart-showcase.json"):
            imported, computed = refresh_catalog_metrics_from_koca(json_path)
            if imported:
                print(
                    f"   已重建 catalog_product_metrics：KOCA 匯入 {imported} 筆、"
                    f"heat 重算 {computed} 筆"
                )
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BlindBox 圖鑑種子（僅 KOCA 盲盒 gatcha_goods）"
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=KOCA_JSON,
        help=f"KOCA showcase JSON（預設 {KOCA_JSON.relative_to(REPO_ROOT)}）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只解析統計，不寫入資料庫",
    )
    parser.add_argument(
        "--no-dev-user",
        action="store_true",
        help="不建立開發用使用者 (Yu)",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="先刪除圖鑑與市集資料（保留 users），再匯入",
    )
    parser.add_argument(
        "--no-prune",
        action="store_true",
        help="不刪除資料庫中不在本次種子內的舊 catalog_products（預設會 prune）",
    )
    args = parser.parse_args()

    json_path = args.json
    if not json_path.is_file():
        raise SystemExit(f"找不到 JSON：{json_path}")

    run_seed(
        json_path,
        dry_run=args.dry_run,
        seed_user=not args.no_dev_user,
        replace_catalog=args.replace,
        prune_stale=not args.no_prune,
    )


if __name__ == "__main__":
    main()
