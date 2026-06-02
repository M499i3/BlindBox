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

## 認證（JWT）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | Body: `{ "email", "password" }` → `{ access_token, user }` |
| GET | `/api/auth/me` | 需 `Authorization: Bearer <token>` |

環境變數：`JWT_SECRET_KEY`（必填於正式環境）、`JWT_EXPIRE_DAYS`（預設 7）。

前端登入後將 token 存於 `localStorage`，刷新頁面仍保持登入。  
Swagger 手動測試仍可使用 `X-User-Id` header 作為後備。

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
npm run db:seed       # 圖鑑 + user1@test.com（密碼 password）
npm run db:seed:demo  # 3 使用者 + 市集/訂單/聊天/通知 demo（需先 db:seed）
npm run db:seed:all   # 上述兩者連跑
```

`users.password_hash` 以 bcrypt 儲存；測試帳號 `user1@test.com`～`user3@test.com` 密碼皆為 `password`。

## 聊天 API（`/api/chats`）

需 `Authorization: Bearer <JWT>`（或開發用 `X-User-Id`）。一間聊天室對應一筆上架與買賣雙方（`buyer_id` / `seller_id`）。

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/chats` | 收件匣列表 |
| POST | `/api/chats` | Body: `{ "listing_id": "uuid" }`，建立或取得聊天室 |
| GET | `/api/chats/{chat_id}` | 聊天室 header（對方、商品、狀態） |
| GET | `/api/chats/{chat_id}/messages` | 訊息列表 |
| POST | `/api/chats/{chat_id}/messages` | Body: `{ "content": "..." }`，發送文字 |
| POST | `/api/chats/{chat_id}/read` | 標記已讀（204） |

## 訂單 API（`/api/orders`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/orders/mine?role=buyer\|seller` | 我的訂單 |
| POST | `/api/orders` | Body: `{ "listing_id": "uuid" }`，建立訂單並同步聊天室狀態與系統訊息 |
| PATCH | `/api/orders/{order_id}/status` | Body: `{ "status": "paid" }` 等，依角色限制可轉換狀態 |

建立或更新訂單時會自動 `find_or_create` 聊天室、更新 `chats.status`，並插入 `messages.type = system`。

Migration `0003_chat_buyer_seller_order` 為 `chats` 新增 `buyer_id`、`seller_id`、`order_id` 與唯一索引。

## CORS 設定

`main.py` 允許 `localhost` / `127.0.0.1` 的 3001、3002，並以 regex 允許區網 IP（`192.168.x.x`、`10.x.x.x`、`172.16–31.x.x`）的 3001、3002，供手機連 Vite Network 網址測試。

若前端跑在其他 port，在 `backend/main.py` 的 `allow_origins` 或 `allow_origin_regex` 調整後重啟後端。
