/**
 * 1) HTML __NEXT_DATA__ (build metadata)
 * 2) Rendered homepage via r.jina.ai (markdown with real product images from Pop Mart CDNs)
 *
 * Run: npm run scrape:popmart
 * Env: POPMART_URL (default https://www.popmart.com/hk)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'frontend', 'data');
const META_FILE = path.join(OUT_DIR, 'popmart-hk-scrape.json');
const SHOWCASE_FILE = path.join(OUT_DIR, 'popmart-hk-showcase.json');

const SOURCE =
  process.env.POPMART_URL?.trim() || 'https://www.popmart.com/hk';

const JINA_PREFIX = 'https://r.jina.ai/';
const JINA_SOURCES = [
  SOURCE,
  `${SOURCE}/new-arrivals`,
  `${SOURCE}/activities/new-arrivals`,
  `${SOURCE}/ip`,
  `${SOURCE}/collection/186`,
];

function pickSafeNextData(raw) {
  const rc = raw.runtimeConfig || {};
  const countries = Array.isArray(rc.country_list)
    ? rc.country_list.map((c) => ({
        code: c.code,
        enName: c.enName,
        continent:
          typeof c.continent === 'string'
            ? c.continent
            : c.continent?.default ?? null,
      }))
    : [];

  return {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE,
    page: raw.page,
    buildId: raw.buildId,
    locale: raw.locale,
    locales: raw.locales,
    assetPrefix: raw.assetPrefix,
    countryLanguages: rc.COUNTRY_LANGUAGES ?? null,
    countryList: countries,
  };
}

function extractNextDataJson(html) {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) throw new Error('No __NEXT_DATA__ script tag found');
  return JSON.parse(m[1]);
}

/** Web-friendly size for prototype UI */
function optimizeImageUrl(url) {
  const base = url.split('?')[0];
  return `${base}?x-oss-process=image/resize,w_800/quality,q_85/format,webp`;
}

/**
 * @param {string} md - full Jina markdown body
 */
function parseShowcaseMarkdown(md) {
  const products = [];
  const seen = new Set();

  const calRe =
    /\[!\[[^\]]*\]\((https:[^)]+)\)\s*([^\]]+)\]\((https:\/\/www\.popmart\.com\/hk\/products\/\d+(?:\/[^)]*)?)\)/g;
  let m;
  while ((m = calRe.exec(md))) {
    const imageRaw = m[1];
    const label = m[2].trim();
    const pageUrl = m[3];
    const idMatch = pageUrl.match(/\/products\/(\d+)/);
    const id = idMatch ? idMatch[1] : '';
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const priceMatch = label.match(/(HK\$[\d.,]+)\s*$/);
    const price = priceMatch ? priceMatch[1] : '';
    const title = label.replace(/\s*HK\$[\d.,]+\s*$/, '').trim();
    products.push({
      id,
      title: title || `Product ${id}`,
      price,
      image: optimizeImageUrl(imageRaw),
      sourceUrl: pageUrl,
    });
  }

  const banners = [];
  const bannerSeen = new Set();
  const banRe =
    /\[!\[[^\]]*\]\((https:\/\/global-static\.popmart\.com[^)]+)\)\]\((https:\/\/www\.popmart\.com\/hk\/products\/\d+(?:\/[^)]*)?)\)/g;
  while ((m = banRe.exec(md))) {
    const pageUrl = m[2];
    const idMatch = pageUrl.match(/\/products\/(\d+)/);
    const id = idMatch ? idMatch[1] : '';
    if (!id || bannerSeen.has(id)) continue;
    bannerSeen.add(id);
    banners.push({
      id,
      image: optimizeImageUrl(m[1]),
      sourceUrl: pageUrl,
    });
  }

  return { products, banners };
}

function mergeUniqueProducts(chunks) {
  const byId = new Map();
  for (const c of chunks) {
    for (const p of c.products) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
  }
  return [...byId.values()];
}

function mergeUniqueBanners(chunks) {
  const byId = new Map();
  for (const c of chunks) {
    for (const b of c.banners) {
      if (!byId.has(b.id)) byId.set(b.id, b);
    }
  }
  return [...byId.values()];
}

function deriveIpHints(products) {
  const hints = new Set();
  const rules = [
    ['THE MONSTERS', 'LABUBU'],
    ['SKULLPANDA', 'SKULLPANDA'],
    ['CRYBABY', 'CRYBABY'],
    ['星星人', '星星人'],
    ['歡迎來到月球表面', '星星人'],
    ['HIRONO', 'Hirono'],
    ['ZSIGA', 'Zsiga'],
    ['PINO JELLY', 'PINO JELLY'],
    ['LABUBU', 'LABUBU'],
    ['HACIPUPU', 'HACIPUPU'],
    ['PUCKY', 'PUCKY'],
    ['DIMOO', 'Dimoo'],
    ['MOLLY', 'Molly'],
    ['CHAKA', 'CHAKA'],
  ];
  for (const p of products) {
    const t = p.title || '';
    const u = t.toUpperCase();
    for (const [key, ip] of rules) {
      if (key === '星星人' || key === '歡迎來到月球表面') {
        if (t.includes(key)) hints.add(ip);
      } else if (u.includes(key)) {
        hints.add(ip);
      }
    }
  }
  return [...hints];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const res = await fetch(SOURCE, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; BlindBoxScraper/1.0; +local-dev)',
      'accept-language': 'zh-Hant,en;q=0.9',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${SOURCE}`);
  }

  const html = await res.text();
  const next = extractNextDataJson(html);
  const meta = pickSafeNextData(next);
  await writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  console.log('Wrote', path.relative(ROOT, META_FILE), meta.buildId);

  const parsedChunks = [];
  for (const src of JINA_SOURCES) {
    const readerUrl = `${JINA_PREFIX}${src}`;
    const jinaRes = await fetch(readerUrl, {
      headers: {
        'x-return-format': 'markdown',
        'user-agent': 'Mozilla/5.0 (compatible; BlindBoxScraper/1.0)',
      },
    });
    if (!jinaRes.ok) continue;
    const jinaBody = await jinaRes.text();
    const md = jinaBody.split('Markdown Content:')[1]?.trim() || jinaBody;
    const parsed = parseShowcaseMarkdown(md);
    parsedChunks.push(parsed);
  }

  const products = mergeUniqueProducts(parsedChunks);
  const banners = mergeUniqueBanners(parsedChunks);
  const ipHints = deriveIpHints(products);

  const showcase = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE,
    jinaReader: `${JINA_PREFIX}${SOURCE}`,
    extraSources: JINA_SOURCES,
    ipHints,
    banners,
    products,
  };
  await writeFile(SHOWCASE_FILE, JSON.stringify(showcase, null, 2), 'utf8');
  console.log(
    'Wrote',
    path.relative(ROOT, SHOWCASE_FILE),
    `(${products.length} products, ${banners.length} hero banners)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
