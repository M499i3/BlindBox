# Domain — 型別定義

本資料夾定義前端共用的 **TypeScript 型別**，鏡像後端 `backend/src/domain/entities.py` 的 Pydantic 模型。

## 子目錄

| 目錄 | 說明 |
|------|------|
| `entities/` | `Listing`、`CatalogProduct`、`UserProfile` 等型別 |

## 說明

- 這些型別只是 TypeScript 介面，不包含任何業務邏輯或 API 呼叫
- 後端 API 回傳 snake_case，前端 API client 在 `infrastructure/api/` 中負責轉換為 camelCase
- Repository 介面已隨重構移除（業務邏輯全移後端）

整體架構說明見 [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)。
