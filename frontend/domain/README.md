# 應用邏輯層 — 資料模型與 Repository 介面

本資料夾在**全端三層架構**中歸屬**應用邏輯層**（非獨立第四層），用於集中定義：

- `entities/` — 系統使用的資料結構（Listing、圖鑑商品、使用者設定等）
- `repositories/` — 資料存取**介面**（由資料層實作）

Service（`frontend/application/services/`）依賴此處的型別與介面，再交由資料層（`frontend/infrastructure/`）具體讀寫。

整體架構說明見 [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)。
