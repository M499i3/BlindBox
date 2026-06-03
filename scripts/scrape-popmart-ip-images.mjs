/**
 * Scrape Pop Mart HK POP NOW nav IP icons (from embedded RSC HTML).
 *
 * Run: npm run scrape:popmart:ip-images
 * Source: https://www.popmart.com/hk/popnow/goods/list
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'frontend', 'data', 'popmart-hk-ip-images.json');

const SOURCE_URL =
  process.env.POPMART_POPNOW_URL?.trim() ||
  'https://www.popmart.com/hk/popnow/goods/list';

/** Pop Mart menu slugs → display labels (align with catalog_seed_lib IP_SLUGS) */
const SLUG_LABELS = {
  'baby-molly': 'Baby Molly',
  chaka: 'CHAKA',
  crybaby: 'CRYBABY',
  dimoo: 'Dimoo',
  disney: '迪士尼',
  hacipupu: 'HACIPUPU',
  hirono: 'Hirono',
  kubo: 'KUBO',
  labubu: 'LABUBU',
  molly: 'Molly',
  'pino-jelly': 'PINO JELLY',
  polar: 'POLAR',
  pucky: 'PUCKY',
  skullpanda: 'SKULLPANDA',
  spongebob: 'SpongeBob',
  'sweet-bean': '小甜豆',
  'twinkle-twinkle': '星星人',
  zsiga: 'Zsiga',
};

const IP_SLUGS = new Set(Object.keys(SLUG_LABELS));

function optimizeImageUrl(url) {
  const base = url.split('?')[0];
  return `${base}?x-oss-process=image/resize,w_256/quality,q_85/format,webp`;
}

function parseIpImagesFromHtml(html) {
  const re =
    /https:\/\/global-static\.popmart\.com\/globalAdmin\/(\d+)____([a-z0-9-]+)____\.webp/gi;
  /** @type {Map<string, { id: string, url: string }[]>} */
  const buckets = new Map();

  for (const m of html.matchAll(re)) {
    const slug = m[2].toLowerCase();
    if (!IP_SLUGS.has(slug)) continue;
    if (!buckets.has(slug)) buckets.set(slug, []);
    buckets.get(slug).push({ id: m[1], url: m[0] });
  }

  const ips = [];
  for (const slug of [...buckets.keys()].sort()) {
    const entries = buckets.get(slug).sort((a, b) => Number(a.id) - Number(b.id));
    const image = optimizeImageUrl(entries[0].url);
    const imageHover = optimizeImageUrl(
      entries.length > 1 ? entries[entries.length - 1].url : entries[0].url
    );
    ips.push({
      slug,
      name: SLUG_LABELS[slug],
      image,
      imageHover,
    });
  }

  return ips;
}

async function main() {
  console.log(`Fetching ${SOURCE_URL} …`);
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${SOURCE_URL}`);
  }
  const html = await res.text();
  const ips = parseIpImagesFromHtml(html);
  if (ips.length === 0) {
    throw new Error('No IP images found in page HTML (layout may have changed).');
  }

  const bySlug = Object.fromEntries(ips.map((ip) => [ip.slug, ip]));
  const payload = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    ips,
    bySlug,
  };

  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`✅ Wrote ${ips.length} IPs → ${path.relative(ROOT, OUT_FILE)}`);
  for (const ip of ips) {
    console.log(`   ${ip.name} (${ip.slug})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
