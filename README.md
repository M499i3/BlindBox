# BlindBox

盲盒收藏與市集應用原型（React + Vite 前端 + Python FastAPI 後端）。

## 系統架構

採**全端三層架構**：表現層 → 應用邏輯層 → 資料層，前後端各自對應，以 HTTP JSON API 溝通。詳見 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**。

```
前端（純 UI）  ──HTTP + JWT──►  FastAPI 後端  ──psycopg2──►  PostgreSQL（Supabase）
```

## 專案結構

| 目錄 | 說明 |
|------|------|
| `frontend/` | React + Vite 前端（不直連 DB） |
| `backend/` | Python FastAPI 後端；詳見 [backend/README.md](backend/README.md) |
| `docs/` | 架構文件 |
| `scripts/` | 爬蟲、`schema.sql` |

## 快速啟動

### 1. 環境設定

複製 `.env.example` 為 `.env`，至少設定：

```env
VITE_API_URL=http://localhost:8000
DATABASE_URL=postgresql://postgres.[ref]:[密碼]@aws-0-xxx.pooler.supabase.com:5432/postgres
JWT_SECRET_KEY=change-me-in-production
JWT_EXPIRE_DAYS=7
```

認證改為 **JWT**：在 `http://localhost:3001/login` 登入，token 存於瀏覽器 `localStorage`，刷新頁面仍保持登入。**不必**再設定 `VITE_DEV_USER_ID`。

### 2. 資料庫初始化

**首次或要整庫重置**（推薦）：

```bash
npm run db:migrate       # 僅第一次或 schema 有變更時
npm run db:reset:seed    # 清空 18 張表 → 圖鑑 JSON + 5 使用者全表種子
```

**僅追加、不清空**（舊流程，可能與既有資料衝突）：

```bash
npm run db:seed:all      # 圖鑑 upsert + demo 標記資料
```

亦可先在 Supabase SQL Editor 執行 [`scripts/schema.sql`](scripts/schema.sql)，再 `npm run db:stamp` 與 `db:reset:seed`。

圖鑑來自 `frontend/data/popmart-hk-showcase.json`（爬蟲 showcase）；其餘表由 `reset_and_seed_all.py` 寫入（含 **4 個拆盒團**、`split_box_groups` / `split_box_slots` 與對應 `group_buy` 上架）。

### 3. 啟動後端

```bash
npm run backend:install   # 首次：Python 依賴（含 PyJWT、bcrypt）
npm run backend:dev       # http://localhost:8000 ，Swagger /docs
```

### 4. 啟動前端

```bash
npm install
npm run dev               # http://localhost:3001
```

開啟 `http://localhost:3001/login`，用下方測試帳號登入後使用市集、聊天等功能。

### 手機／區網測試

1. 電腦與手機同一 Wi‑Fi，先啟動 **後端** 再啟動 **前端**（`npm run backend:dev`、`npm run dev`）。
2. 手機瀏覽器開終端機顯示的 **Network** 網址，例如 `http://192.168.0.140:3001/login`。
3. 前端會自動把 API 指到同一 IP 的 `8000` 埠（無需改 `.env` 的 `VITE_API_URL`）。
4. 若仍無法連線：確認 Windows 防火牆允許 **3001、8000**；手機先開 `http://<電腦IP>:8000/docs` 能開 Swagger 即代表後端可達。

## 常用指令

```bash
npm run dev               # 前端開發（port 3001）
npm run backend:dev       # 後端開發（port 8000）
npm run backend:install   # 安裝後端 Python 依賴
npm run build             # 前端 production build
npm run lint              # TypeScript 型別檢查

npm run db:migrate        # alembic upgrade head
npm run db:current        # 查看 migration 版本
npm run db:reset:seed     # 清空並植入全表種子（推薦）
npm run db:seed           # 僅圖鑑 upsert + user1
npm run db:seed:demo      # 舊 demo 種子（需先 db:seed）
npm run db:seed:all       # db:seed + db:seed:demo
npm run db:seed:dry       # 預覽圖鑑種子，不寫入
```

## 測試帳號（密碼皆 `password`）

`db:reset:seed` 後可用 **5 位**使用者；每位至少 **4 筆上架**、**3 筆購物車**、**4 筆訂單**（買家）。

| Email | 顯示名稱 | 建議用途 |
|-------|----------|----------|
| `user1@test.com` | Yu | 賣家、上架、與 user2 聊天 |
| `user2@test.com` | Mina_Lab | 買家、購物車、多筆訂單 |
| `user3@test.com` | 潮流收藏家_Ken | 買賣兼修、團購主辦 |
| `user4@test.com` | Luna_Collect | 收藏向、交換提案 |
| `user5@test.com` | Alex_Trade | 交換與多筆訂單 |

切換帳號：個人檔案 → **登出**，再以另一組 email 登入。

## 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/auth/login` | Body: `{ "email", "password" }` → `access_token` + `user` |
| `GET` | `/api/auth/me` | 需 `Authorization: Bearer <token>` |

其餘需登入的 API 皆帶 Bearer token（前端 `apiClient` 自動附加）。Swagger 手動測試可改用 `X-User-Id` header（僅開發用）。

## 後端 API 摘要

完整說明見 [backend/README.md](backend/README.md)。

| 區塊 | 端點 | 說明 |
|------|------|------|
| 圖鑑 | `GET /api/catalog/products`、`/brands`、`/products/{id}` | 圖鑑列表與搜尋 |
| 上架 | `GET/POST /api/listings`、`GET /mine`、`GET /{id}` | 市集貼文 |
| 購物車 | `GET /api/cart`、`POST/DELETE .../items/{id}` | 需登入 |
| 個人 | `GET/PUT /api/profile/me` | 需登入 |
| 市集 | `GET /api/marketplace/trending-tags`、`/rankings` | 熱門標籤、排行榜 |
| 訂單 | `GET /api/orders/mine?role=buyer\|seller` | 購買/出售紀錄 |
| 訂單 | `POST /api/orders`、`PATCH /api/orders/{id}/status` | 下單；狀態變更會同步聊天室 |
| 通知 | `GET /api/notifications` | 通知列表 |
| 聊天 | `GET/POST /api/chats` | 收件匣、依 `listing_id` 開啟或取得聊天室 |
| 聊天 | `GET /api/chats/{id}`、`GET/POST .../messages`、`POST .../read` | 詳情、發訊息、已讀 |

同一商品 + 買賣雙方僅一間聊天室（DB 唯一索引 `listing_id, buyer_id, seller_id`）。

## 前端功能與資料來源

| 已接後端 API | 仍為 UI 假資料／未接 API |
|--------------|-------------------------|
| 登入、市集貼文、購物車、我的上架、個人檔案 | 探索頁「收藏冊／願望清單／圖鑑進度」（由圖鑑列表 slice 展示） |
| 聊天、聯絡賣家、發訊息、聊天室下單 | 圖鑑商品詳情頁「其他賣家」列表（非真實 listings） |
| 購買/出售紀錄、通知 | 個人檔案部分統計數字（如收藏 42、已完成 128） |

## 尚未實作

- 交換提案（`swap_proposals`）、拆盒團
- 聊天圖片訊息、上傳
- 註冊、Refresh token、正式環境密鑰輪替
- 收藏冊／願望清單後端 API（`user_collections` 表已存在）
