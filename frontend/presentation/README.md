# 表現層（Presentation Layer）

本資料夾屬於**全端三層架構**中的**表現層**，主要由 React 負責。

## 職責

- 頁面呈現、使用者互動、表單、畫面狀態、路由
- 透過 `hooks`、`providers` 呼叫**應用邏輯層**（Service），不直接讀寫 localStorage / Supabase / JSON

## 子目錄

| 目錄 | 說明 |
|------|------|
| `pages/` | 功能頁面 |
| `components/` | 共用 UI |
| `hooks/` | 例如 `useCatalog`、`useMarketplace` |
| `providers/` | 例如 `AppServicesProvider`、`AppStateProvider` |
| `router/` | 路由 |

## 依賴

```
pages → hooks / providers → 應用邏輯層（application/services）
```

請勿在 `pages/` 內 `import` 資料層路徑（`frontend/infrastructure/...`）。

整體架構說明見 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)。
