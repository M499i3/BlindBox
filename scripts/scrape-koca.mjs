/**
 * Scrape Pop Mart catalog from KOCA (TW) public API.
 *
 * Run: npm run scrape:koca
 * Env: KOCA_PLANET=popmart (default)
 *      KOCA_LOCALE=zh-TW
 *
 * Outputs:
 *   frontend/data/koca-popmart-showcase.json  — catalog-shaped products
 *   frontend/data/koca-popmart-meta.json      — IPs, stats, scrape metadata
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'frontend', 'data');
const SHOWCASE_FILE = path.join(OUT_DIR, 'koca-popmart-showcase.json');
const META_FILE = path.join(OUT_DIR, 'koca-popmart-meta.json');

const BASE = 'https://koca.shop';
const PLANET = process.env.KOCA_PLANET?.trim() || 'popmart';
const LOCALE = process.env.KOCA_LOCALE?.trim() || 'zh-TW';
const PAGE_SIZE = Number(process.env.KOCA_PAGE_SIZE || 100);
const REQUEST_DELAY_MS = Number(process.env.KOCA_DELAY_MS || 120);

/** KOCA member name → app IP label (Twinkle Twinkle = 星星人) */
const IP_DISPLAY = {
  MOLLY: 'Molly',
  'Baby Molly': 'Baby Molly',
  DIMOO: 'Dimoo',
  LABUBU: 'LABUBU',
  SKULLPANDA: 'SKULLPANDA',
  CRYBABY: 'CRYBABY',
  小甜豆: '小甜豆',
  HIRONO: 'Hirono',
  HACIPUPU: 'HACIPUPU',
  迪士尼: '迪士尼',
  KUBO: 'KUBO',
  'Twinkle Twinkle': '星星人',
  'PINO JELLY': 'PINO JELLY',
  SpongeBob: 'SpongeBob',
  Zsiga: 'Zsiga',
  CHAKA: 'CHAKA',
  POLAR: 'POLAR',
  '其他 IP': '其他 IP',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(urlPath, { retries = 3 } = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; BlindBoxScraper/1.0)',
        'accept-language': `${LOCALE},zh;q=0.9`,
      },
    });
    if (!res.ok) {
      if (attempt < retries && res.status >= 500) {
        await sleep(REQUEST_DELAY_MS * attempt);
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json();
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function fetchAllRecords(planetSlug, resource) {
  const rows = [];
  let cursor = null;
  let lastCursor = null;
  let total = 0;

  for (let page = 0; page < 500; page += 1) {
    const qs =
      cursor == null
        ? `limit=${PAGE_SIZE}`
        : `limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`;
    const data = await fetchJson(`/api/planets/${planetSlug}/${resource}?${qs}`);
    total = data.total ?? total;
    const batch = data.records ?? [];
    rows.push(...batch);
    if (!batch.length) break;
    if (data.next == null || data.next === lastCursor) break;
    lastCursor = data.next;
    cursor = data.next;
    await sleep(REQUEST_DELAY_MS);
  }

  return { rows, total };
}

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function extractSeriesKey(name) {
  const m = String(name || '').match(/(.+?系列)/);
  return m ? normalizeText(m[1]) : '';
}

function formatNtd(amount) {
  if (amount == null || !Number.isFinite(amount)) return '';
  const n = Math.round(amount);
  return `NT$${n.toLocaleString('en-US')}`;
}

function priceStats(prices) {
  if (!prices.length) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  return {
    currency: 'TWD',
    listingCount: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    median: Math.round(median),
  };
}

function buildProductIndex(products) {
  const bySeries = new Map();
  for (const p of products) {
    const price = Number(String(p.price || '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = extractSeriesKey(p.name);
    if (!key || key.length < 4) continue;
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push({ ...p, priceNum: price });
  }
  return bySeries;
}

function matchMarketPrice(item, bySeries) {
  const seriesKey = extractSeriesKey(item.name);
  if (seriesKey && bySeries.has(seriesKey)) {
    return priceStats(bySeries.get(seriesKey).map((p) => p.priceNum));
  }

  const itemNorm = normalizeText(item.name);
  if (itemNorm.length < 6) return null;

  let best = null;
  for (const [key, listings] of bySeries) {
    if (key.length >= 4 && (itemNorm.includes(key) || key.includes(itemNorm.slice(0, 8)))) {
      const stats = priceStats(listings.map((p) => p.priceNum));
      if (!best || stats.listingCount > best.listingCount) best = stats;
    }
  }
  return best;
}

function cleanTitle(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function itemUrl(id) {
  return `${BASE}/${LOCALE}/items/${id}`;
}

function ipPlanetUrl(slug) {
  return `${BASE}/${LOCALE}/planets/${slug}`;
}

function toShowcaseProduct(item, ipMember, marketPrice) {
  const title = cleanTitle(item.name);
  const ipName = IP_DISPLAY[ipMember.name] ?? ipMember.name;
  const priceAmount = marketPrice?.avg ?? marketPrice?.min ?? null;

  return {
    id: String(item.id),
    title,
    price: priceAmount != null ? formatNtd(priceAmount) : '',
    image: item.thumbnailUrl || '',
    sourceUrl: itemUrl(item.id),
    ip: ipName,
    ipSlug: ipMember.id,
    typeId: item.typeId || null,
    artistName: item.artistName || null,
    numOfSeller: item.numOfSeller ?? 0,
    numOfCollected: item.numOfCollected ?? 0,
    isSecret: /隱藏|secret/i.test(title),
    marketPrice,
  };
}

function ipPriority(slug) {
  if (slug === 'popmart_others') return 0;
  if (slug === `popmart`) return 1;
  return 2;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Fetching KOCA planet ${PLANET}…`);
  const planetData = await fetchJson(`/api/planets/${PLANET}`);
  const members = (planetData.planet?.members ?? []).filter(
    (m) => m.id && m.id !== PLANET
  );

  console.log(`IPs: ${members.length}`);
  for (const m of members) {
    console.log(`  - ${m.name} (${m.id})`);
  }

  console.log('\nFetching marketplace listings for resale prices…');
  const { rows: productRows, total: productTotal } = await fetchAllRecords(
    PLANET,
    'products'
  );
  console.log(`  ${productRows.length} listings (API total hint: ${productTotal})`);
  const productsBySeries = buildProductIndex(productRows);

  const byId = new Map();
  const ipStats = [];

  for (const member of members) {
    console.log(`\nScraping items: ${member.name}…`);
    const { rows, total } = await fetchAllRecords(member.id, 'items');
    let withPrice = 0;

    for (const item of rows) {
      const marketPrice = matchMarketPrice(item, productsBySeries);
      if (marketPrice) withPrice += 1;

      const product = toShowcaseProduct(item, member, marketPrice);
      const existing = byId.get(product.id);

      if (!existing) {
        byId.set(product.id, product);
        continue;
      }

      const keepNew =
        ipPriority(member.id) > ipPriority(existing.ipSlug) ||
        (!existing.marketPrice && product.marketPrice);

      if (keepNew) {
        byId.set(product.id, {
          ...product,
          alsoInIps: [...new Set([...(existing.alsoInIps ?? []), existing.ip])],
        });
      } else if (existing.ip !== product.ip) {
        existing.alsoInIps = [...new Set([...(existing.alsoInIps ?? []), product.ip])];
      }
    }

    ipStats.push({
      id: member.id,
      name: member.name,
      displayIp: IP_DISPLAY[member.name] ?? member.name,
      url: member.url || ipPlanetUrl(member.id),
      itemCount: rows.length,
      apiTotal: total,
      withMarketPrice: withPrice,
    });
    console.log(`  ${rows.length} items (${withPrice} with matched resale prices)`);
  }

  const products = [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
  const withMarket = products.filter((p) => p.marketPrice).length;

  const ipHints = [...new Set(products.map((p) => p.ip))].sort();

  const showcase = {
    scrapedAt: new Date().toISOString(),
    source: 'koca',
    sourceUrl: `${BASE}/${LOCALE}/planets/${PLANET}`,
    apiBase: BASE,
    planet: PLANET,
    locale: LOCALE,
    currency: 'TWD',
    ipHints,
    ips: ipStats,
    stats: {
      uniqueProducts: products.length,
      withMarketPrice: withMarket,
      marketplaceListings: productRows.length,
    },
    banners: [],
    products,
  };

  const meta = {
    scrapedAt: showcase.scrapedAt,
    sourceUrl: showcase.sourceUrl,
    ips: ipStats,
    stats: showcase.stats,
    notes: [
      'ip assigned from KOCA sub-planet pages',
      'price = average resale (TWD) from KOCA marketplace listings matched by 系列 name',
      'Run npm run db:seed after replacing or pointing seed at this file',
    ],
  };

  await writeFile(SHOWCASE_FILE, JSON.stringify(showcase, null, 2) + '\n', 'utf8');
  await writeFile(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf8');

  console.log('\nDone.');
  console.log('Wrote', path.relative(ROOT, SHOWCASE_FILE));
  console.log('Wrote', path.relative(ROOT, META_FILE));
  console.log(
    `Products: ${products.length} unique | ${withMarket} with market price | ${ipHints.length} IPs`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
