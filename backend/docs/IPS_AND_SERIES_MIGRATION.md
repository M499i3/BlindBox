# IPs + 產品線 Series 遷移

## 目標模型

```
brands → ips（原 `series` 表，一列一個 IP）
      → series（新表，`deriveSeriesName` 產品線）
            → catalog_products
```

- 系列級 IP：同一產品線名稱下若 KOCA `ip` 不只一種 → 整條 series 歸 **其他 IP**。
- 規則實作：`backend/src/domain/series_rules.py`、`backend/src/domain/catalog_grouping.py`。

## 手動系列規則（標題不含「系列」）

編輯 [`frontend/data/series-title-rules.json`](../../frontend/data/series-title-rules.json)：

```json
{
  "rules": [
    {
      "seriesName": "AZURA日本限定Y2K盲盒",
      "titleContains": "AZURA日本限定Y2K盲盒"
    }
  ]
}
```

標題包含 `titleContains` 即歸入 `seriesName`（較長規則優先）。改完後重跑 backfill 報告即可。

## 步驟

```bash
# 1. 套用 migration
cd backend && alembic upgrade head

# 2. 分析分組（不寫 DB）
python backend/scripts/backfill_product_series.py \
  --json frontend/data/koca-popmart-showcase.json \
  --report-json /tmp/series-groups.json

# 3. 回填 DB
python backend/scripts/backfill_product_series.py \
  --json frontend/data/koca-popmart-showcase.json \
  --apply
```

`--apply` 會：

- upsert `ips` / `series`
- 更新 `catalog_products.ip_id`、`catalog_products.series_id`
- 重算 `series.total_count`、`ips.total_count`
- 依圖鑑商品同步 `listings`、`split_box_groups` 的 `series_id` / `ip_id`

## Migration

- 檔案：`alembic/versions/20260604_0009_ips_and_product_series.py`
- `series` → `ips`；`catalog_products.series_id` → `ip_id`
- 新建產品線 `series`（含 `ip_id` FK）
- `listings` / `split_box_groups`：原 `series_id` → `ip_id`，另加產品線 `series_id`

## 尚未遷移（後續 PR）

- `catalog_seed_lib` / `seed_catalog` 種子改寫四層
- API `catalog_repository`：`series_name` 改指產品線，新增 `ip_name`
- 前端 Explore / `buildCatalogHierarchy` 改吃 API
