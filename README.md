# BlindBox

盲盒收藏與市集應用原型（React + Vite 前端 + Python FastAPI 後端）。

## 系統架構

採**全端三層架構**：表現層 → 應用邏輯層 → 資料層，前後端各自對應，以 HTTP JSON API 溝通。詳見 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**。

```
前端（純 UI）  ──HTTP──►  FastAPI 後端  ──psycopg2──►  PostgreSQL（Supabase）
```

## 專案結構

| 目錄 | 說明 |
|------|------|
| `frontend/` | React + Vite 前端（純 UI，不直連 DB） |
| `backend/` | Python FastAPI 後端（業務邏輯 + 資料存取） |
| `docs/` | 架構文件 |
| `scripts/` | 爬蟲工具 |

## 快速啟動

### 1. 環境設定（`.env`）

```env
# 前端連後端
VITE_API_URL=http://localhost:8000

# 開發用使用者 UUID（X-User-Id header）
VITE_DEV_USER_ID=<執行 npm run db:seed 取得>

# 後端連 PostgreSQL
DATABASE_URL=postgresql://postgres.[ref]:[密碼]@aws-0-xxx.pooler.supabase.com:5432/postgres
```

### 2. 資料庫初始化

```bash
# 在 Supabase SQL Editor 執行 scripts/schema.sql
# 然後匯入圖鑑種子資料
npm run db:seed
```

### 3. 啟動後端

```bash
npm run backend:install   # 首次安裝 Python 依賴
npm run backend:dev       # uvicorn --reload，port 8000
```

### 4. 啟動前端

```bash
npm install
npm run dev               # Vite，port 3001
```

瀏覽器開啟 `http://localhost:3001`，後端 Swagger UI 在 `http://localhost:8000/docs`。

## 常用指令

```bash
npm run dev               # 前端開發
npm run backend:dev       # 後端開發
npm run backend:install   # 安裝後端 Python 依賴
npm run build             # 前端 production build
npm run lint              # TypeScript 型別檢查

npm run db:migrate        # Alembic upgrade head
npm run db:current        # 查看 migration 版本
npm run db:seed           # 匯入圖鑑 + 建立開發用使用者
npm run db:seed:dry       # 預覽種子，不寫入
```

## 後端 API 端點

| 端點 | 說明 |
|------|------|
| `GET /api/catalog/products` | 圖鑑商品列表（支援 `?q=` 搜尋、`?brand=` 篩選） |
| `GET /api/catalog/products/{id}` | 單一商品 |
| `GET /api/catalog/brands` | 品牌列表 |
| `GET /api/listings` | 全部上架貼文 |
| `GET /api/listings/mine` | 我的上架（需 X-User-Id） |
| `GET /api/listings/{id}` | 單一貼文 |
| `POST /api/listings` | 新增上架 |
| `GET /api/cart` | 購物車 |
| `POST /api/cart/items/{id}` | 加入購物車 |
| `DELETE /api/cart/items/{id}` | 移除購物車 |
| `GET /api/profile/me` | 個人資料 |
| `PUT /api/profile/me` | 更新個人資料 |
| `GET /api/marketplace/trending-tags` | 熱門標籤 |
| `GET /api/marketplace/rankings` | 排行榜 |

## 尚未接後端（前端假資料）

- 聊天室（Chat / ChatDetail）
- 通知中心（NotificationsHub）
- 購買／出售記錄（PurchaseHistory / SellingHistory）
- 交換提案、拆盒團、評價系統
