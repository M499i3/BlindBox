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
