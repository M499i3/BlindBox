# 資料層（Data Layer）

本資料夾為**全端三層架構**中的**資料層**，負責資料的讀寫與持久化。

## 職責

- Repository **實作**（localStorage、靜態 JSON、Supabase、未來 API）
- 環境設定、Supabase Client、Service 組裝（`di/`）

## 子目錄

| 路徑 | 說明 |
|------|------|
| `persistence/local/` | 瀏覽器 localStorage |
| `persistence/static/` | 圖鑑 JSON |
| `persistence/supabase/` | Supabase 連線與 Repository |
| `di/` | `getAppContainer()` 組裝 Service + Repository |
| `config/` | `VITE_DATA_SOURCE` 等設定 |

## 資料來源

由 `.env` 的 `VITE_DATA_SOURCE` 控制（`local` | `supabase` | `api`）。

驗證 Supabase：`npm run check:supabase`

整體架構說明見 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)。
