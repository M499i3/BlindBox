-- BlindBox PostgreSQL Schema
-- 執行前請確認已建立目標資料庫，並以具有 SUPERUSER 或 CREATE EXTENSION 權限的帳號執行。

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- 三元組索引，支援中文標題搜尋


-- ============================================================
-- DOMAIN 1: CATALOG  (brands → series → catalog_products)
-- ============================================================

CREATE TABLE brands (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,           -- 'popmart', 'skullpanda', '52toys'
    name        TEXT NOT NULL,                  -- 'Pop Mart', 'SKULLPANDA'
    logo_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 系列屬於某品牌，例如「LABUBU The Monsters」→ Pop Mart
CREATE TABLE series (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    cover_url   TEXT,
    total_count INT NOT NULL DEFAULT 0,         -- 該系列總款數
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (brand_id, slug)
);

-- 官方商品圖鑑（由 popmart-hk-showcase.json 種子資料匯入）
-- external_id 保留原始爬取 ID，支援冪等 upsert
CREATE TABLE catalog_products (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id             TEXT UNIQUE,
    series_id               UUID REFERENCES series(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    -- 官方售價以最小貨幣單位儲存（HK$ 19.00 → 1900）
    official_price_amount   INT,
    official_price_currency CHAR(3),            -- 'HKD', 'TWD', 'CNY'
    image_url               TEXT,
    source_url              TEXT,
    is_secret               BOOLEAN NOT NULL DEFAULT false,  -- 隱藏款
    released_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_products_series ON catalog_products(series_id);
CREATE INDEX idx_catalog_products_title_trgm ON catalog_products USING gin(title gin_trgm_ops);

CREATE TABLE catalog_product_metrics (
    catalog_product_id        UUID PRIMARY KEY REFERENCES catalog_products(id) ON DELETE CASCADE,
    koca_seller_count         INT NOT NULL DEFAULT 0,
    koca_collected_count      INT NOT NULL DEFAULT 0,
    koca_market_listing_count INT NOT NULL DEFAULT 0,
    koca_heat_score           SMALLINT NOT NULL DEFAULT 0 CHECK (koca_heat_score BETWEEN 0 AND 100),
    koca_refreshed_at         TIMESTAMPTZ,
    monthly_order_count       INT NOT NULL DEFAULT 0,
    monthly_search_count      INT NOT NULL DEFAULT 0,
    monthly_wish_count        INT NOT NULL DEFAULT 0,
    internal_heat_score       SMALLINT NOT NULL DEFAULT 0 CHECK (internal_heat_score BETWEEN 0 AND 100),
    heat_score                SMALLINT NOT NULL DEFAULT 0 CHECK (heat_score BETWEEN 0 AND 100),
    heat_source               TEXT NOT NULL DEFAULT 'koca' CHECK (heat_source IN ('koca', 'blended', 'internal')),
    computed_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_product_metrics_heat ON catalog_product_metrics(heat_score DESC);


-- ============================================================
-- DOMAIN 2: USERS
-- ============================================================

CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 8 位數字顯示 ID（UI 顯示為 #88204912），不可變更
    display_id        BIGINT NOT NULL UNIQUE DEFAULT floor(random() * 90000000 + 10000000)::BIGINT,
    display_name      TEXT NOT NULL,
    email             TEXT UNIQUE,
    password_hash     TEXT NOT NULL,
    phone             TEXT UNIQUE,
    bio               TEXT,
    avatar_url        TEXT,                     -- 儲存 URL，不存 base64
    status            user_status_enum NOT NULL DEFAULT 'active',
    -- 反正規化計數器，由 trigger 維護
    rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg BETWEEN 0 AND 5),
    rating_count      INT NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ               -- 軟刪除
);

CREATE INDEX idx_users_display_id ON users(display_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- 每筆已完成訂單雙向各可評一次（買家評賣家、賣家評買家）
CREATE TABLE user_ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL,                  -- FK 待 orders 建立後 ALTER TABLE 加入
    rater_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score       SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, rater_id)                 -- 每筆訂單每人只能評一次
);

CREATE INDEX idx_user_ratings_ratee ON user_ratings(ratee_id);

CREATE TYPE collection_type_enum AS ENUM ('collected', 'wishlist');

CREATE TABLE user_collections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catalog_product_id  UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    type                collection_type_enum NOT NULL,
    note                TEXT,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, catalog_product_id, type)
);

CREATE INDEX idx_user_collections_user ON user_collections(user_id, type);
CREATE INDEX idx_user_collections_product ON user_collections(catalog_product_id);


-- ============================================================
-- DOMAIN 3: MARKETPLACE
-- ============================================================

CREATE TYPE listing_condition_enum AS ENUM (
    'sealed',       -- 全新未拆
    'opened',       -- 已拆盒
    'displayed'     -- 展示過
);

CREATE TYPE trade_mode_enum AS ENUM (
    'sell',         -- 我要賣
    'swap',         -- 我想換
    'group_buy'     -- 加入拆盒團
);

CREATE TYPE shipping_method_enum AS ENUM (
    '711_store',    -- 7-11 店到店
    'family_store', -- 全家 店到店
    'in_person',    -- 面交 (特定區域)
    'post_office'   -- 郵局包裹
);

CREATE TYPE listing_status_enum AS ENUM (
    'draft',
    'active',
    'reserved',     -- 洽談中
    'sold',
    'removed'
);

CREATE TABLE listings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- 可選連結至官方圖鑑商品
    catalog_product_id  UUID REFERENCES catalog_products(id) ON DELETE SET NULL,
    -- 反正規化品牌/系列，避免每次查詢都要透過 catalog_products 三層 JOIN
    brand_id            UUID REFERENCES brands(id) ON DELETE SET NULL,
    series_id           UUID REFERENCES series(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    item_name           TEXT NOT NULL,          -- 子系列或變體名稱
    description         TEXT,
    -- 價格以最小貨幣單位儲存（NT$299 → 29900, TWD）
    price_amount        INT NOT NULL DEFAULT 0,
    price_currency      CHAR(3) NOT NULL DEFAULT 'TWD',
    condition           listing_condition_enum NOT NULL,
    trade_mode          trade_mode_enum NOT NULL DEFAULT 'sell',
    shipping_method     shipping_method_enum NOT NULL DEFAULT '711_store',
    allow_swap          BOOLEAN NOT NULL DEFAULT false,
    allow_bargain       BOOLEAN NOT NULL DEFAULT false,
    status              listing_status_enum NOT NULL DEFAULT 'active',
    -- 反正規化計數器，用於首頁排行；view_count 建議批次寫入避免寫放大
    view_count          INT NOT NULL DEFAULT 0,
    like_count          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ
);

-- 所有活躍商品查詢均使用 WHERE deleted_at IS NULL 的 partial index
CREATE INDEX idx_listings_seller ON listings(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_status ON listings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_brand_series ON listings(brand_id, series_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_catalog_product ON listings(catalog_product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_created_at ON listings(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_price ON listings(price_currency, price_amount) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_title_trgm ON listings USING gin(title gin_trgm_ops);

-- 每筆上架最多 9 張照片，sort_order=0 為主圖
CREATE TABLE listing_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_images_listing ON listing_images(listing_id, sort_order);

-- 伺服器端購物車，支援跨裝置同步
CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id);


-- ============================================================
-- DOMAIN 4: TRANSACTIONS
-- ============================================================

CREATE TYPE order_status_enum AS ENUM (
    'pending_payment',  -- 待付款
    'paid',
    'shipped',          -- 已寄出
    'delivered',
    'completed',        -- 已完成，開放雙向評價
    'cancelled',
    'disputed'
);

CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status          order_status_enum NOT NULL DEFAULT 'pending_payment',
    -- 快照下單時的價格，與 listing 無關聯
    amount          INT NOT NULL,
    currency        CHAR(3) NOT NULL,
    shipping_method shipping_method_enum NOT NULL,
    tracking_number TEXT,
    shipping_note   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at         TIMESTAMPTZ,
    shipped_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_listing ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;

-- orders 建立後補上 user_ratings 的 FK
ALTER TABLE user_ratings
    ADD CONSTRAINT fk_user_ratings_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE RESTRICT;

CREATE TYPE swap_proposal_status_enum AS ENUM (
    'pending', 'accepted', 'rejected', 'cancelled', 'completed'
);

-- 交換提案錨定聊天室（FK 待 chats 建立後 ALTER TABLE 補上）
CREATE TABLE swap_proposals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id             UUID NOT NULL,
    proposer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offered_listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    wanted_listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    additional_amount   INT NOT NULL DEFAULT 0,     -- 補貼金額（最小貨幣單位）
    additional_currency CHAR(3),
    message             TEXT,
    status              swap_proposal_status_enum NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX idx_swap_proposals_proposer ON swap_proposals(proposer_id);
CREATE INDEX idx_swap_proposals_receiver ON swap_proposals(receiver_id);
CREATE INDEX idx_swap_proposals_chat ON swap_proposals(chat_id);

CREATE TYPE group_buy_status_enum AS ENUM ('open', 'full', 'completed', 'cancelled');

CREATE TABLE group_buys (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_product_id      UUID NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
    organizer_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_count            SMALLINT NOT NULL CHECK (target_count > 0),
    current_count           SMALLINT NOT NULL DEFAULT 0 CHECK (current_count >= 0),
    status                  group_buy_status_enum NOT NULL DEFAULT 'open',
    description             TEXT,
    price_per_slot_amount   INT,
    price_per_slot_currency CHAR(3),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    closes_at               TIMESTAMPTZ,
    CONSTRAINT chk_group_buy_counts CHECK (current_count <= target_count)
);

CREATE INDEX idx_group_buys_product ON group_buys(catalog_product_id, status);
CREATE INDEX idx_group_buys_organizer ON group_buys(organizer_id);

CREATE TABLE group_buy_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_buy_id    UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_number     SMALLINT,           -- 抽到的格子編號（開箱後填入）
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_buy_id, user_id)
);

CREATE INDEX idx_group_buy_members_group ON group_buy_members(group_buy_id);
CREATE INDEX idx_group_buy_members_user ON group_buy_members(user_id);


-- ============================================================
-- DOMAIN 5: SOCIAL
-- ============================================================

CREATE TYPE chat_status_enum AS ENUM (
    'active',
    'swapping',         -- 交換中
    'pending_payment',  -- 待付款
    'completed',
    'archived'
);

-- 每間聊天室恰好兩位參與者（由 chat_participants 約束）
CREATE TABLE chats (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id              UUID REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id                UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id                UUID REFERENCES orders(id) ON DELETE SET NULL,
    status                  chat_status_enum NOT NULL DEFAULT 'active',
    -- 反正規化，供收件匣列表避免子查詢
    last_message_preview    TEXT,
    last_message_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chats_listing ON chats(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC NULLS LAST);
CREATE UNIQUE INDEX idx_chats_listing_pair
    ON chats (listing_id, buyer_id, seller_id)
    WHERE listing_id IS NOT NULL AND buyer_id IS NOT NULL AND seller_id IS NOT NULL;

CREATE TABLE chat_participants (
    chat_id      UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unread_count INT NOT NULL DEFAULT 0,
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_participants_user ON chat_participants(user_id, chat_id);

-- chats 建立後補上 swap_proposals 的 FK
ALTER TABLE swap_proposals
    ADD CONSTRAINT fk_swap_proposals_chat FOREIGN KEY (chat_id)
    REFERENCES chats(id) ON DELETE CASCADE;

CREATE TYPE message_type_enum AS ENUM (
    'text',
    'swap_proposal',    -- 交換提案卡片，對應 swap_proposals 行
    'image',
    'system'            -- 自動狀態訊息
);

CREATE TABLE messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id          UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type             message_type_enum NOT NULL DEFAULT 'text',
    content          TEXT,
    swap_proposal_id UUID REFERENCES swap_proposals(id) ON DELETE SET NULL,
    image_url        TEXT,
    is_deleted       BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at ASC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- 每則訊息的個別已讀狀態（多人房間擴充用）
CREATE TABLE message_reads (
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TYPE notification_type_enum AS ENUM ('system', 'activity', 'trade', 'support');

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type_enum NOT NULL DEFAULT 'system',
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    action_url  TEXT,                   -- deep-link，例如 /listing/:id
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
