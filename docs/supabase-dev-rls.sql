-- BlindBox 開發用 RLS（僅供原型／尚未接 Auth 時）
-- 在 Supabase Dashboard → SQL Editor 執行一次。
-- 正式環境請改為 auth.uid() 與最小權限政策。

-- Catalog：匿名可讀
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_anon_read_brands" ON brands;
CREATE POLICY "dev_anon_read_brands" ON brands FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "dev_anon_read_series" ON series;
CREATE POLICY "dev_anon_read_series" ON series FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "dev_anon_read_catalog_products" ON catalog_products;
CREATE POLICY "dev_anon_read_catalog_products" ON catalog_products FOR SELECT TO anon USING (true);

-- Users：開發用可讀寫（建立 VITE_DEV_USER_ID 用）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_anon_users_all" ON users;
CREATE POLICY "dev_anon_users_all" ON users FOR ALL TO anon USING (true) WITH CHECK (true);

-- Marketplace
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_anon_listings_select" ON listings;
CREATE POLICY "dev_anon_listings_select" ON listings FOR SELECT TO anon USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "dev_anon_listings_write" ON listings;
CREATE POLICY "dev_anon_listings_write" ON listings FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_anon_listing_images" ON listing_images;
CREATE POLICY "dev_anon_listing_images" ON listing_images FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_anon_cart_items" ON cart_items;
CREATE POLICY "dev_anon_cart_items" ON cart_items FOR ALL TO anon USING (true) WITH CHECK (true);
