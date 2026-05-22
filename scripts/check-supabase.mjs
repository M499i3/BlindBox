import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mask = (s) =>
  !s ? '(empty)' : `${s.slice(0, 6)}...${s.slice(-4)} (len=${s.length})`;

console.log('--- env ---');
console.log('VITE_SUPABASE_URL       :', url || '(empty)');
console.log('VITE_SUPABASE_ANON_KEY  :', mask(anon));
console.log('SUPABASE_SERVICE_ROLE   :', mask(service));

if (!url || !anon) {
  console.error('\n[FAIL] 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('\n--- 1) REST ping (anon key) ---');
try {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  console.log('HTTP', res.status, res.statusText);
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.log('body:', text.slice(0, 300));
  } else {
    console.log('[OK] Supabase REST 端點可達且 anon key 被接受');
  }
} catch (e) {
  console.error('[FAIL] 無法連線到 Supabase URL:', e.message);
  console.error('cause:', e.cause);
  process.exit(1);
}

console.log('\n--- 2) Auth session check ---');
const supabase = createClient(url, anon);
const { data, error } = await supabase.auth.getSession();
if (error) {
  console.error('[FAIL] auth.getSession 失敗:', error.message);
  process.exit(1);
}
console.log('[OK] auth.getSession 成功，session =', data.session ? '已登入' : '無（匿名）');

console.log('\n--- 3) 嘗試列出 public schema 一張表（可選） ---');
const probeTable = process.env.SUPABASE_PROBE_TABLE;
if (!probeTable) {
  console.log('未設定 SUPABASE_PROBE_TABLE，跳過。');
  console.log('如想測試讀取，請在 .env 加：SUPABASE_PROBE_TABLE=你的表名');
} else {
  const { data: rows, error: qErr } = await supabase
    .from(probeTable)
    .select('*')
    .limit(1);
  if (qErr) {
    console.error(`[WARN] 查詢 ${probeTable} 失敗:`, qErr.message);
  } else {
    console.log(`[OK] 從 ${probeTable} 取得 ${rows?.length ?? 0} 筆樣本`);
  }
}

console.log('\n✅ Supabase 連線檢查完成');
