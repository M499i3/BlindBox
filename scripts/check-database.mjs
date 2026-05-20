/**
 * 檢查 DATABASE_URL 主機是否可解析（DNS）
 * Run: npm run db:check
 */
import 'dotenv/config';
import dns from 'node:dns/promises';

const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '';
if (!url) {
  console.error('[FAIL] 未設定 DATABASE_URL');
  console.error('請從 Supabase Dashboard → Database → Connection string 複製 Session URI');
  process.exit(1);
}

let host;
try {
  host = new URL(url.replace(/^postgresql\+psycopg2:/, 'postgresql:')).hostname;
} catch {
  console.error('[FAIL] DATABASE_URL 格式無效');
  process.exit(1);
}

console.log('主機:', host);

try {
  const addrs = await dns.lookup(host, { all: true });
  console.log('[OK] DNS 解析成功:', addrs.map((a) => a.address).join(', '));
} catch (e) {
  console.error('[FAIL] 無法解析主機:', e.message);
  if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
    console.error('\n提示: db.*.supabase.co 常無法解析。請改用 Dashboard 的 Session pooler URI，');
    console.error('例如 aws-0-<region>.pooler.supabase.com');
  }
  process.exit(1);
}
