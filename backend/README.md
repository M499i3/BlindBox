# Backend（API 與資料庫）

## 資料庫版本管理（Alembic）

本專案使用 [Alembic](https://alembic.sqlalchemy.org/) 管理 **PostgreSQL**（Supabase）schema 變更，屬於全端架構中的**資料層**。

### 目錄

| 路徑 | 說明 |
|------|------|
| `alembic.ini` | Alembic 設定 |
| `alembic/versions/` | 每次 schema 變更一個 revision |
| `migrations/sql/initial_schema.sql` | 初始完整 schema（參考用） |
| `src/infrastructure/db/` | 連線設定、ORM `Base`、未來模型 |

### 環境準備

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

在**專案根目錄** `.env` 設定：

```env
# 從 Dashboard → Database → Connect → Session mode → 複製 URI（推薦）
DATABASE_URL=postgresql://postgres.[ref]:[密碼]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

或（需知道 region）：

```env
SUPABASE_DB_PASSWORD=你的資料庫密碼
SUPABASE_DB_REGION=ap-southeast-1
```

> **注意**
> - `VITE_SUPABASE_ANON_KEY` 不能取代資料庫密碼。
> - 勿手動拼 `db.xxx.supabase.co`；許多專案該主機無 DNS，會出現 `could not translate host name`。
> - 專案若為 **Paused**，請先在 Dashboard 恢復後再 migrate。

先執行 `npm run db:check` 確認主機可解析，再 `alembic upgrade head`。

### 表已經存在（DuplicateTable / relation already exists）

代表資料庫裡**已有** schema（例如在 Supabase SQL Editor 跑過），但 Alembic 還沒記錄版本。

在 `backend/` 目錄執行**其中一種**即可：

```bash
# 方式 A：再跑一次 upgrade（會偵測 brands 表已存在並略過建表，只寫入版本記錄）
alembic upgrade head

# 方式 B：手動標記為已套用，不執行任何 SQL
alembic stamp head
```

確認：`alembic current` 應顯示 `0001_initial_schema (head)`。

### 常用指令

在 `backend/` 目錄、已啟用 venv 時執行：

```bash
# 查看目前版本
alembic current

# 套用所有未執行的 migration
alembic upgrade head

# 退回上一版
alembic downgrade -1

# 建立新 migration（修改 ORM 模型後）
alembic revision --autogenerate -m "add_xxx_table"
alembic upgrade head
```

專案根目錄亦可：

```bash
npm run db:migrate
npm run db:current
npm run db:seed
```

### 圖鑑種子（catalog）

從 `frontend/data/popmart-hk-showcase.json` 冪等匯入 brands、series、catalog_products：

```bash
# 專案根目錄
npm run db:seed:dry
npm run db:seed
```

實作：`backend/scripts/seed_catalog.py`、`backend/scripts/catalog_seed_lib.py`。

### 初始 migration

| Revision | 說明 |
|----------|------|
| `0001_initial_schema` | 建立 brands、listings、users、orders、chats 等完整表結構 |

### 注意

- **Service role key** 不能取代 `DATABASE_URL`；migration 需直接連 PostgreSQL。
- 在 Supabase 執行前請確認使用正確專案與權限；`downgrade` 會刪除相關表，請勿在正式環境隨意執行。
- 前端 `npm run check:supabase` 僅驗證 REST/Auth；資料庫 migration 請用 `alembic current`。

整體架構見 [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)。
