#!/usr/bin/env python3
"""依 deriveSeriesName 分組並回填產品線 series（需先跑 0009_ips_and_product_series migration）。

用法：
  # 僅分析 KOCA JSON（不連 DB）
  python backend/scripts/backfill_product_series.py \\
    --json frontend/data/koca-popmart-showcase.json

  # 分析 + 寫入 DB
  python backend/scripts/backfill_product_series.py --apply

  # 從自訂 JSON 寫入
  python backend/scripts/backfill_product_series.py \\
    --json path/to/showcase.json --apply
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
BACKEND_SRC = BACKEND_ROOT / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))
if str(BACKEND_ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT / "scripts"))

from catalog_seed_lib import (  # noqa: E402
    assert_koca_showcase,
    is_koca_blind_box_product,
    load_showcase,
    manufacturer_for_title,
)
from domain.catalog_grouping import (  # noqa: E402
    GroupedProduct,
    build_grouped_products,
    build_series_groups,
    grouping_summary,
    ip_slug_and_name,
    line_slug_and_name,
)
from domain.series_rules import derive_series_name, FALLBACK_SERIES  # noqa: E402

DEFAULT_JSON = (
    Path(__file__).resolve().parents[2] / "frontend" / "data" / "koca-popmart-showcase.json"
)


def _pg_url() -> str:
    from infrastructure.db.config import get_database_url

    return get_database_url().replace("postgresql+psycopg2://", "postgresql://", 1)


def _schema_ready(cur) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'ips'
        ) AS has_ips,
        EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'series'
        ) AS has_series,
        EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'catalog_products'
              AND column_name = 'ip_id'
        ) AS has_ip_id
        """
    )
    row = cur.fetchone()
    return bool(row["has_ips"] and row["has_series"] and row["has_ip_id"])


def products_from_showcase(path: Path) -> list[GroupedProduct]:
    showcase = load_showcase(path)
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
        rows.append({**raw, "title": title, "external_id": external_id})
    by_brand: dict[str, list[dict[str, Any]]] = defaultdict(list)
    brand_names: dict[str, str] = {}
    for raw in rows:
        title = raw["title"]
        brand_slug, brand_name = manufacturer_for_title(title)
        brand_names[brand_slug] = brand_name
        by_brand[brand_slug].append(raw)
    out: list[GroupedProduct] = []
    for brand_slug, brand_rows in by_brand.items():
        out.extend(
            build_grouped_products(
                brand_rows,
                brand_slug=brand_slug,
                brand_name=brand_names[brand_slug],
            )
        )
    return out


def products_from_db(cur) -> list[GroupedProduct]:
    cur.execute(
        """
        SELECT
            cp.external_id,
            cp.title,
            cp.image_url,
            b.slug AS brand_slug,
            b.name AS brand_name,
            i.name AS ip_name
        FROM catalog_products cp
        JOIN ips i ON i.id = cp.ip_id
        JOIN brands b ON b.id = i.brand_id
        WHERE cp.external_id IS NOT NULL
        ORDER BY cp.title
        """
    )
    rows = cur.fetchall()
    products: list[GroupedProduct] = []
    for row in rows:
        title = str(row["title"] or "").strip()
        external_id = str(row["external_id"] or "").strip()
        if not title or not external_id:
            continue
        line_name = derive_series_name(title)
        line_slug, _ = line_slug_and_name(line_name)
        ip_name = str(row["ip_name"] or "").strip() or "其他 IP"
        products.append(
            GroupedProduct(
                external_id=external_id,
                title=title,
                brand_slug=str(row["brand_slug"]),
                brand_name=str(row["brand_name"]),
                line_name=line_name,
                line_slug=line_slug,
                koca_ip=ip_name,
                image_url=row.get("image_url"),
            )
        )
    return products


def _upsert_brand(cur, slug: str, name: str) -> str:
    cur.execute(
        """
        INSERT INTO brands (slug, name)
        VALUES (%s, %s)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (slug, name),
    )
    return str(cur.fetchone()["id"])


def _upsert_ip(cur, brand_id: str, ip_slug: str, ip_name: str, cover_url: str | None) -> str:
    cur.execute(
        """
        INSERT INTO ips (brand_id, slug, name, cover_url)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (brand_id, slug) DO UPDATE
            SET name = EXCLUDED.name,
                cover_url = COALESCE(EXCLUDED.cover_url, ips.cover_url)
        RETURNING id
        """,
        (brand_id, ip_slug, ip_name, cover_url),
    )
    return str(cur.fetchone()["id"])


def _upsert_product_series(
    cur,
    brand_id: str,
    ip_id: str,
    line_slug: str,
    line_name: str,
    cover_url: str | None,
) -> str:
    cur.execute(
        """
        INSERT INTO series (brand_id, ip_id, slug, name, cover_url)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (brand_id, ip_id, slug) DO UPDATE
            SET name = EXCLUDED.name,
                cover_url = COALESCE(EXCLUDED.cover_url, series.cover_url),
                updated_at = now()
        RETURNING id
        """,
        (brand_id, ip_id, line_slug, line_name, cover_url),
    )
    return str(cur.fetchone()["id"])


def apply_backfill(cur, products: list[GroupedProduct]) -> dict[str, int]:
    groups = build_series_groups(products)
    brand_ids: dict[str, str] = {}
    ip_ids: dict[tuple[str, str], str] = {}
    series_ids: dict[tuple[str, str, str], str] = {}
    covers: dict[tuple[str, str, str], str | None] = {}
    ext_to_group = {eid: g for g in groups for eid in g.external_ids}

    for p in products:
        g = ext_to_group.get(p.external_id)
        if not g:
            continue
        key = (g.brand_slug, g.ip_slug, g.line_slug)
        if key not in covers and p.image_url:
            covers[key] = p.image_url

    for g in groups:
        if g.brand_slug not in brand_ids:
            brand_ids[g.brand_slug] = _upsert_brand(cur, g.brand_slug, g.brand_name)
        brand_id = brand_ids[g.brand_slug]
        ip_key = (g.brand_slug, g.ip_slug)
        if ip_key not in ip_ids:
            cover = covers.get((g.brand_slug, g.ip_slug, g.line_slug))
            ip_ids[ip_key] = _upsert_ip(cur, brand_id, g.ip_slug, g.ip_name, cover)
        ip_id = ip_ids[ip_key]
        series_key = (g.brand_slug, g.ip_slug, g.line_slug)
        if series_key not in series_ids:
            cover = covers.get(series_key)
            series_ids[series_key] = _upsert_product_series(
                cur, brand_id, ip_id, g.line_slug, g.line_name, cover
            )

    linked_products = 0
    for p in products:
        g = ext_to_group.get(p.external_id)
        if not g:
            continue
        series_key = (g.brand_slug, g.ip_slug, g.line_slug)
        ip_key = (g.brand_slug, g.ip_slug)
        cur.execute(
            """
            UPDATE catalog_products
            SET ip_id = %s,
                series_id = %s,
                updated_at = now()
            WHERE external_id = %s
            """,
            (ip_ids[ip_key], series_ids[series_key], p.external_id),
        )
        if cur.rowcount:
            linked_products += 1

    cur.execute(
        """
        UPDATE series s
        SET total_count = COALESCE(sub.cnt, 0),
            updated_at = now()
        FROM series s_all
        LEFT JOIN (
            SELECT series_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE series_id IS NOT NULL
            GROUP BY series_id
        ) sub ON sub.series_id = s_all.id
        WHERE s.id = s_all.id
        """
    )
    series_updated = cur.rowcount

    cur.execute(
        """
        UPDATE ips i
        SET total_count = COALESCE(sub.cnt, 0),
            updated_at = now()
        FROM ips i_all
        LEFT JOIN (
            SELECT ip_id, COUNT(*)::int AS cnt
            FROM catalog_products
            WHERE ip_id IS NOT NULL
            GROUP BY ip_id
        ) sub ON sub.ip_id = i_all.id
        WHERE i.id = i_all.id
        """
    )
    ips_updated = cur.rowcount

    cur.execute(
        """
        UPDATE listings l
        SET series_id = cp.series_id,
            ip_id = cp.ip_id,
            updated_at = now()
        FROM catalog_products cp
        WHERE l.catalog_product_id = cp.id
          AND cp.series_id IS NOT NULL
        """
    )
    listings_updated = cur.rowcount

    cur.execute(
        """
        UPDATE split_box_groups g
        SET series_id = agg.series_id,
            ip_id = agg.ip_id,
            updated_at = now()
        FROM (
            SELECT s.group_id,
                   MIN(cp.series_id) AS series_id,
                   MIN(cp.ip_id) AS ip_id
            FROM split_box_slots s
            JOIN catalog_products cp
              ON cp.external_id = s.catalog_product_external_id
            WHERE cp.series_id IS NOT NULL
              AND cp.ip_id IS NOT NULL
            GROUP BY s.group_id
            HAVING COUNT(DISTINCT cp.series_id) = 1
               AND COUNT(DISTINCT cp.ip_id) = 1
        ) agg
        WHERE g.id = agg.group_id
        """
    )
    split_boxes_updated = cur.rowcount

    return {
        "series_groups": len(groups),
        "series_rows": len(series_ids),
        "products_linked": linked_products,
        "series_counts_updated": series_updated,
        "ips_counts_updated": ips_updated,
        "listings_updated": listings_updated,
        "split_box_groups_updated": split_boxes_updated,
    }


def write_unassigned_titles_report(products: list[GroupedProduct], txt_out: Path) -> int:
    titles = sorted(
        {
            p.title
            for p in products
            if derive_series_name(p.title) == FALLBACK_SERIES
        }
    )
    txt_out.parent.mkdir(parents=True, exist_ok=True)
    txt_out.write_text("\n".join(titles) + ("\n" if titles else ""), encoding="utf-8")
    return len(titles)


def write_markdown_report(
    groups: list,
    summary: dict[str, Any],
    md_out: Path,
) -> None:
    sorted_groups = sorted(groups, key=lambda g: (-g.product_count, g.line_name))
    lines = [
        "# 系列分類報告（KOCA 盲盒 dry-run）",
        "",
        f"- 商品數：{summary['product_count']}",
        f"- 系列數：{summary['series_count']}",
        f"- 多 IP 系列：{summary['multi_ip_series_count']}",
        "",
        "## 多 IP 系列（歸其他 IP）",
        "",
        "| 系列名 | 款數 | KOCA IP 數 |",
        "|--------|------|------------|",
    ]
    for row in summary["multi_ip_series"]:
        lines.append(f"| {row['line']} | {row['products']} | {len(row['koca_ips'])} |")
    lines += [
        "",
        "## 全部系列（依款數排序）",
        "",
        "| 系列名 | 款數 | 歸屬 IP | 多 IP |",
        "|--------|------|---------|-------|",
    ]
    for g in sorted_groups:
        multi = "是" if len(g.koca_ips_seen) > 1 else ""
        lines.append(f"| {g.line_name} | {g.product_count} | {g.ip_name} | {multi} |")
    md_out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def print_report(products: list[GroupedProduct], *, json_out: Path | None) -> None:
    groups = build_series_groups(products)
    summary = grouping_summary(groups)
    print("=== 產品線分組摘要 ===")
    print(f"  商品數：{summary['product_count']}")
    print(f"  系列數：{summary['series_count']}")
    print(f"  多 IP 系列（整包→其他 IP）：{summary['multi_ip_series_count']}")
    if summary["multi_ip_series"]:
        print("\n  範例（最多 50 筆）：")
        for row in summary["multi_ip_series"]:
            ips = ", ".join(row["koca_ips"])
            print(
                f"    [{row['brand']}] {row['line']} "
                f"→ {row['assigned_ip']} （KOCA: {ips}，{row['products']} 款）"
            )
    if json_out:
        payload = {
            "summary": summary,
            "groups": [
                {
                    "brand_slug": g.brand_slug,
                    "line_slug": g.line_slug,
                    "line_name": g.line_name,
                    "ip_slug": g.ip_slug,
                    "ip_name": g.ip_name,
                    "product_count": g.product_count,
                    "koca_ips": sorted(g.koca_ips_seen),
                    "external_ids": sorted(g.external_ids),
                }
                for g in groups
            ],
        }
        json_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        md_out = json_out.with_suffix(".md")
        write_markdown_report(groups, summary, md_out)
        unassigned_out = json_out.parent / "unassigned-series-titles.txt"
        unassigned_n = write_unassigned_titles_report(products, unassigned_out)
        print(f"\n已寫入報告：{json_out}")
        print(f"已寫入報告：{md_out}")
        print(f"已寫入未分系列：{unassigned_out}（{unassigned_n} 款）")


def main() -> None:
    parser = argparse.ArgumentParser(description="產品線 series 分組與 DB 回填")
    parser.add_argument(
        "--json",
        type=Path,
        default=None,
        help=f"KOCA showcase JSON（預設僅 --apply 時可改；分析預設 {DEFAULT_JSON.name}）",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="寫入 DB（需已 migrate 0009）",
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=None,
        help="輸出完整分組 JSON 報告",
    )
    args = parser.parse_args()

    json_path = args.json or DEFAULT_JSON
    if not json_path.is_file() and args.json is None and not args.apply:
        parser.error(f"找不到預設 JSON：{json_path}")

    products: list[GroupedProduct]
    if json_path.is_file():
        products = products_from_showcase(json_path)
        print(f"來源：{json_path}（{len(products)} 筆盲盒）")
    elif args.apply:
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError as e:
            raise SystemExit("缺少 psycopg2，請安裝 backend requirements") from e
        conn = psycopg2.connect(_pg_url())
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not _schema_ready(cur):
                    raise SystemExit(
                        "資料庫尚未套用 0009_ips_and_product_series。"
                        "請先：cd backend && alembic upgrade head"
                    )
                products = products_from_db(cur)
                print(f"來源：DB catalog_products（{len(products)} 筆）")
        finally:
            conn.close()
    else:
        raise SystemExit(f"找不到 JSON：{json_path}")

    print_report(products, json_out=args.report_json)

    if not args.apply:
        print("\n[dry-run] 未寫入 DB。加上 --apply 以回填。")
        return

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError as e:
        raise SystemExit("缺少 psycopg2") from e

    conn = psycopg2.connect(_pg_url())
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not _schema_ready(cur):
                    raise SystemExit("請先執行 alembic upgrade head（0009）")
                stats = apply_backfill(cur, products)
        print("\n=== DB 回填完成 ===")
        for k, v in stats.items():
            print(f"  {k}: {v}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
