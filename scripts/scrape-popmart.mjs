import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const TARGET_URL = 'https://www.popmart.com/us/collection/10'
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/popmart-collection-10.json')

function safeText(value) {
  return (value ?? '').trim()
}

function normalizeImage(url) {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  return url
}

function splitTitleToIpSeries(title) {
  const clean = safeText(title)
  const separators = [' - ', ' | ', ': ']

  for (const sep of separators) {
    if (clean.includes(sep)) {
      const [left, ...rest] = clean.split(sep)
      return {
        ip: safeText(left),
        series: safeText(rest.join(sep)),
      }
    }
  }

  return {
    ip: '',
    series: clean,
  }
}

async function scrapeCollection() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const networkItems = []

  page.on('response', async (response) => {
    const request = response.request()
    const resourceType = request.resourceType()
    const url = response.url()
    if (!['xhr', 'fetch'].includes(resourceType)) return
    if (!url.includes('popmart')) return

    try {
      const payload = await response.json()
      const extracted = extractProductCandidates(payload)
      if (extracted.length > 0) {
        networkItems.push(...extracted)
      }
    } catch {
      // Ignore non-JSON responses.
    }
  })

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(2000)

    for (let i = 0; i < 10; i += 1) {
      await page.mouse.wheel(0, 1200)
      await page.waitForTimeout(500)
    }

    let cards = []
    try {
      cards = await evaluateCardsWithRetry(page)
    } catch {
      // Some anti-bot flows keep navigating and destroy execution context.
      // In that case we still keep network-captured results.
    }

    const deduped = []
    const seenKey = new Set()
    const mergedCandidates = [
      ...cards,
      ...networkItems.map((item) => ({
        title: item.title,
        image: item.image,
        link: item.link || '',
      })),
    ]

    for (const card of mergedCandidates) {
      const title = safeText(card.title).replace(/\s+/g, ' ')
      if (!title) continue

      const key = `${title}__${card.image}`
      if (seenKey.has(key)) continue
      seenKey.add(key)

      const { ip, series } = splitTitleToIpSeries(title)
      deduped.push({
        source: TARGET_URL,
        title,
        ip,
        series,
        image: normalizeImage(card.image),
        link: normalizeProductLink(card.link),
      })
    }

    const withDetailImages = await hydrateImagesFromDetailPages(browser, deduped)
    const existing = await readExistingOutput()
    const finalOutput = chooseBestOutput(existing, withDetailImages)

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2), 'utf8')

    const resolvedCount = finalOutput.filter((item) => item.image && !item.image.includes('xxx')).length
    console.log(`Scraped ${withDetailImages.length} items in this run.`)
    console.log(`Resolved real image URLs for ${resolvedCount} items in saved file.`)
    console.log(`Saved to: ${OUTPUT_FILE}`)
  } finally {
    await browser.close()
  }
}

function extractProductCandidates(payload) {
  const results = []
  const queue = [payload]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue

    if (Array.isArray(current)) {
      queue.push(...current)
      continue
    }

    const title =
      current.title ||
      current.name ||
      current.goodsName ||
      current.productName ||
      current.seriesName
    const image =
      current.image ||
      current.cover ||
      current.coverImg ||
      current.mainImage ||
      current.picUrl ||
      current.thumbnail
    const link =
      current.link ||
      current.url ||
      current.detailUrl ||
      current.productUrl ||
      current.goodsUrl ||
      current.path

    if (title && (image || link)) {
      results.push({
        title: String(title),
        image: String(image || ''),
        link: String(link || ''),
      })
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        queue.push(value)
      }
    }
  }

  return results
}

async function readExistingOutput() {
  try {
    const text = await fs.readFile(OUTPUT_FILE, 'utf8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function chooseBestOutput(existing, latest) {
  if (latest.length === 0 && existing.length > 0) return existing
  if (latest.length > existing.length) return latest

  const latestWithImage = latest.filter((item) => item.image && !item.image.includes('xxx')).length
  const existingWithImage = existing.filter((item) => item.image && !item.image.includes('xxx')).length
  if (latestWithImage >= existingWithImage) return latest
  return existing
}

function normalizeProductLink(link) {
  const raw = safeText(link)
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('/')) return `https://www.popmart.com${raw}`
  return `https://www.popmart.com/${raw}`
}

async function hydrateImagesFromDetailPages(browser, items) {
  const links = [...new Set(items.map((item) => item.link).filter((link) => Boolean(link) && link !== 'https://www.popmart.com'))]
  if (links.length === 0) return items

  const detailImageMap = new Map()
  const page = await browser.newPage()

  try {
    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(1200)

        const detailImage = await page.evaluate(() => {
          const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
          if (og) return og

          const twitter = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
          if (twitter) return twitter

          const jsonLdNodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          for (const node of jsonLdNodes) {
            try {
              const parsed = JSON.parse(node.textContent || '{}')
              if (typeof parsed?.image === 'string') return parsed.image
              if (Array.isArray(parsed?.image) && parsed.image[0]) return parsed.image[0]
            } catch {
              // Ignore malformed JSON-LD.
            }
          }

          return ''
        })

        if (detailImage) {
          detailImageMap.set(link, normalizeImage(detailImage))
        }
      } catch {
        // Skip pages that cannot be crawled due to anti-bot/challenge.
      }
    }
  } finally {
    await page.close()
  }

  return items.map((item) => {
    const detailImage = detailImageMap.get(item.link)
    const currentLooksBad = !item.image || item.image.includes('xxx')
    return {
      ...item,
      image: detailImage && currentLooksBad ? detailImage : item.image,
    }
  })
}

async function evaluateCardsWithRetry(page, retries = 3) {
  let lastError
  for (let i = 0; i < retries; i += 1) {
    try {
      return await page.evaluate(() => {
        const selectors = [
          '[data-testid*="product"]',
          '[class*="product"]',
          '[class*="goods"]',
          'a[href*="/product/"]',
        ]

        const matched = new Set()
        const results = []

        for (const selector of selectors) {
          const nodes = document.querySelectorAll(selector)
          for (const node of nodes) {
            const root = node.closest('a, article, li, div') || node
            if (matched.has(root)) continue
            matched.add(root)

            const titleNode =
              root.querySelector('h1, h2, h3, h4, p, span, [class*="title"], [class*="name"]') ||
              root
            const imgNode = root.querySelector('img')
            const hrefNode = root.closest('a') || root.querySelector('a')

            const title = (titleNode?.textContent || '').trim()
            const image = imgNode?.getAttribute('src') || imgNode?.getAttribute('data-src') || ''
            const link = hrefNode?.getAttribute('href') || ''

            if (!title || !image) continue
            results.push({ title, image, link })
          }
        }

        return results
      })
    } catch (error) {
      lastError = error
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(1000)
    }
  }
  throw lastError
}

scrapeCollection().catch((error) => {
  console.error('Scrape failed:', error)
  process.exit(1)
})
