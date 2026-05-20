# Infrastructure — 前端薄 HTTP Client

本資料夾為前端的**資料層**，負責與後端 FastAPI 溝通，不含業務邏輯。

## 子目錄

| 路徑 | 說明 |
|------|------|
| `api/apiClient.ts` | 基底 `apiFetch<T>()`，自動帶 `X-User-Id` header |
| `api/catalogApi.ts` | 圖鑑商品（GET products、brands） |
| `api/listingsApi.ts` | 上架貼文（GET / POST listings） |
| `api/cartApi.ts` | 購物車（GET / POST / DELETE） |
| `api/profileApi.ts` | 個人資料（GET / PUT profile） |
| `api/marketplaceApi.ts` | 熱門標籤、排行榜 |

## 設計原則

- **薄層**：只做 fetch + snake_case↔camelCase 轉換，不含商業規則
- **單一入口**：所有 API 呼叫都走 `apiFetch`，統一處理 base URL 與 header
- 後端 URL 由 `VITE_API_URL` 環境變數控制（預設 `http://localhost:8000`）

## 使用方式

不要在頁面中直接呼叫，應透過 hooks：

```ts
// ✅ 在 hooks 或 providers 中
import { getListings } from '@/frontend/infrastructure/api/listingsApi';

// ❌ 不要在頁面 component 中直接引用
```

整體架構說明見 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)。
