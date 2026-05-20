# 應用邏輯層（Application Logic Layer）— Service

本資料夾為**應用邏輯層**的主要實作：**Service**（功能流程與商業規則）。

## 職責

- 編排用例（建立貼文、搜尋圖鑑、購物車等）
- 呼叫資料層的 Repository 介面（定義於 `frontend/domain/repositories/`）
- 不包含 React 與具體儲存技術

## 相關程式（同屬應用邏輯層）

| 路徑 | 角色 |
|------|------|
| `frontend/application/services/` | Service 實作 |
| `frontend/domain/entities/` | 資料模型型別 |
| `frontend/domain/repositories/` | Repository 介面（契約） |

> `domain` 為程式碼分類子資料夾，在系統設計文件上不單獨成層。

整體架構說明見 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)。
