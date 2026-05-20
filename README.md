# BlindBox

盲盒收藏與市集原型（React + Vite）。

## 系統架構

採**全端三層架構**：表現層 → 應用邏輯層 → 資料層。詳見 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**。

## 專案結構

| 目錄 | 說明 |
|------|------|
| `frontend/` | 前端 React（Vite 入口：`frontend/main.tsx`） |
| `backend/` | 後端 API 預留；**Alembic** 資料庫版本管理 |
| `docs/` | 架構文件 |

## 開發

```bash
npm install
npm run dev          # http://localhost:3001
npm run build
npm run check:supabase
```

### 前端 Supabase 資料層

`.env` 設定 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 後，可切換：

```bash
# .env
VITE_DATA_SOURCE=supabase
# 可選：指定開發用使用者 UUID
# VITE_DEV_USER_ID=
```

首次使用請在 Supabase **SQL Editor** 執行 [`docs/supabase-dev-rls.sql`](docs/supabase-dev-rls.sql)（開發用匿名 RLS）。  
`catalog_products` 若尚無資料，圖鑑會自動退回 `frontend/data/popmart-hk-showcase.json`。

### 資料庫種子（圖鑑）

在 migration 完成且 `.env` 已設定 `DATABASE_URL` 後，將 Pop Mart 圖鑑 JSON 匯入 `brands` / `series` / `catalog_products`（可重複執行）：

```bash
npm run db:seed:dry   # 僅統計，不寫入
npm run db:seed       # 寫入 DB，並建立開發用使用者 Yu（email: dev@blindbox.local）
```

腳本會輸出 `VITE_DEV_USER_ID`，可貼到 `.env` 供 Supabase 前端模式使用。

### 資料庫 migration（Alembic）

在 `.env` 設定 `DATABASE_URL`（Supabase PostgreSQL 連線字串）後：

```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
npm run db:migrate      # alembic upgrade head
npm run db:current      # 查看目前版本
```

詳見 [backend/README.md](backend/README.md)。

---

# React + Vite（模板說明）

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
