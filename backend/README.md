# Backend — Python FastAPI

BlindBox 後端，負責所有業務邏輯與資料存取，前端透過 HTTP JSON API 呼叫。

## 目錄結構

```
backend/
├── main.py                        # FastAPI 應用入口、CORS 設定
├── requirements.txt               # Python 依賴
├── .venv/                         # 虛擬環境（不納入版控）
├── alembic.ini                    # Alembic 設定
├── alembic/versions/              # Migration 版本
├── scripts/
│   ├── seed_catalog.py            # 圖鑑種子腳本
│   └── catalog_seed_lib.py        # 種子共用邏輯
└── src/
    ├── api/
    │   ├── dependencies.py        # get_current_user_id、get_db
    │   └── routes/                # catalog、listings、cart、profile、marketplace
    ├── application/               # 業務邏輯 Service
    ├── domain/
    │   └── entities.py            # Pydantic 模型（CatalogProduct、Listing …）
    └── infrastructure/
        └── db/
            ├── config.py          # get_database_url()
            └── repositories/      # SQL 查詢實作
```

## 環境準備

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

或直接用專案根目錄指令：

```bash
npm run backend:install
```

## 啟動

```bash
npm run backend:dev
# 等同：cd backend && uvicorn main:app --reload --reload-dir src --port 8000
```

啟動後 Swagger UI 在 `http://localhost:8000/docs`。

## 環境變數（根目錄 `.env`）

```env
# PostgreSQL 連線字串（Alembic + psycopg2 使用）
DATABASE_URL=postgresql://postgres.[ref]:[密碼]@aws-0-xxx.pooler.supabase.com:5432/postgres
```

後端啟動時自動從根目錄 `.env` 讀取。

## 認證

目前以 `X-User-Id` HTTP header 傳遞使用者 UUID（開發用）。  
前端從 `VITE_DEV_USER_ID` 環境變數取得並帶入每個請求。  
未來可替換為 JWT 驗證，只需修改 `src/api/dependencies.py` 的 `get_current_user_id`。

## 資料庫 Migration（Alembic）

在根目錄 `.env` 設定 `DATABASE_URL` 後：

```bash
npm run db:migrate      # alembic upgrade head
npm run db:current      # 查看目前版本
npm run db:downgrade    # 退回上一版

# 建立新 migration（修改 schema 後）
cd backend
alembic revision --autogenerate -m "add_xxx_column"
alembic upgrade head
```

若資料庫表已存在（在 Supabase SQL Editor 手動建立）但 Alembic 尚未記錄版本：

```bash
cd backend && alembic stamp head
```

## 圖鑑種子

從 `frontend/data/popmart-hk-showcase.json` 匯入 `brands`、`series`、`catalog_products`（可重複執行，使用 upsert）：

```bash
npm run db:seed:dry   # 預覽，不寫入
npm run db:seed       # 寫入 DB，並建立開發用使用者 Yu，輸出 VITE_DEV_USER_ID
```

## CORS 設定

`main.py` 目前允許以下 origin：

- `http://localhost:3001`
- `http://localhost:3002`

若前端跑在其他 port，在 `backend/main.py` 的 `allow_origins` 列表新增即可（需重啟後端）。
