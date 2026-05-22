# 表現層（Presentation Layer）

本資料夾屬於**全端三層架構**中的**表現層**，由 React 負責畫面與互動。

## 職責

- 頁面呈現、使用者操作、表單、路由切換
- 透過 `hooks`、`providers` 呼叫後端 API（不直接操作 DB）
- 所有資料來自 `frontend/infrastructure/api/` 的 HTTP client

## 子目錄

| 目錄 | 說明 |
|------|------|
| `pages/` | 功能頁面（Marketplace、Explore、AddListing 等） |
| `components/` | 共用 UI 元件（TopBar、BottomNav 等） |
| `hooks/` | `useCatalog`（圖鑑 API）等資料 hooks |
| `providers/` | `AppStateProvider`（listings、cart、profile 狀態）、`AppServicesProvider`（空殼） |
| `router/` | 路由定義 |

## 資料取得方式

```
頁面  →  useAppState() / useCatalogProducts()
      →  infrastructure/api/（apiFetch）
      →  FastAPI 後端
```

## 依賴規則

- 頁面透過 hooks 取得資料 ✅
- 頁面直接 `import apiFetch` ❌（應透過 hook）
- 頁面 `import` 後端邏輯 ❌

整體架構說明見 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)。
