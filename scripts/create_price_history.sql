-- 執行方式：貼到 Supabase Dashboard → SQL Editor → Run
-- 建立二級市場歷史交易價資料表

CREATE TABLE IF NOT EXISTS price_history (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 對應到哪個官方圖鑑商品（模糊比對失敗時為 NULL，仍保留原始資料）
    catalog_product_id UUID REFERENCES catalog_products(id) ON DELETE SET NULL,

    -- 成交價（整數最小單位：JPY 3200 = ¥3,200）
    price_amount       INT NOT NULL,
    price_currency     CHAR(3) NOT NULL,          -- 'JPY', 'CNY', 'TWD'

    -- 資料來源
    source             TEXT NOT NULL,             -- 'mercari_jp', 'dewu', 'platform'
    source_item_id     TEXT,                      -- 來源平台的商品 ID，用於去重
    source_title       TEXT,                      -- 原始標題，供人工核查

    -- 成色
    condition          TEXT,                      -- 'sealed', 'opened', 'displayed'

    -- 模糊比對信心分數（0–100），低於閾值的比對仍保留但可過濾
    match_score        NUMERIC(5,2),

    traded_at          TIMESTAMPTZ NOT NULL,      -- 實際成交時間
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 同一來源同一商品不重複寫入
    UNIQUE (source, source_item_id)
);

-- 查詢特定商品的歷史價格走勢（主要查詢）
CREATE INDEX idx_price_history_product_time
    ON price_history(catalog_product_id, traded_at DESC)
    WHERE catalog_product_id IS NOT NULL;

-- 依來源查詢（爬蟲去重用）
CREATE INDEX idx_price_history_source
    ON price_history(source, source_item_id);
