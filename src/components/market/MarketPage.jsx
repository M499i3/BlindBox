import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Clock3, Search, SlidersHorizontal } from 'lucide-react'
import { CATALOG, averagePrice } from '../../data/appData'
import { usePosts } from '../../context/PostsContext'
import { CarouselRow } from '../ui/FormBits'
import { MarketFAB } from '../MarketFAB'
import { postTypeLabel, t } from '../../i18n/zh-TW'

const TRADE_TYPES = ['All', 'Sell', 'Buy Request', 'Exchange']

function matchesSearch(post, item, q) {
  if (!q.trim()) return true
  const s = q.trim().toLowerCase()
  const hay = [item.item, item.series, item.brand, item.ip, post.seller, post.description, post.condition].join(' ').toLowerCase()
  return hay.includes(s)
}

function optAll(v) {
  return v === 'All' ? t.common.all : v
}

function hasNonDefaultFilters({ tradeType, brand, ip, series, instockOnly, priceOrder, timeOrder }) {
  return (
    tradeType !== 'All' ||
    brand !== 'All' ||
    ip !== 'All' ||
    series !== 'All' ||
    instockOnly ||
    priceOrder !== 'none' ||
    timeOrder === 'oldest'
  )
}

export function MarketPage() {
  const { posts } = usePosts()
  const [searchParams] = useSearchParams()
  const focusedItemId = searchParams.get('item')
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [timeOrder, setTimeOrder] = useState('newest')
  const [priceOrder, setPriceOrder] = useState('none')
  const [tradeType, setTradeType] = useState('All')
  const [brand, setBrand] = useState('All')
  const [ip, setIp] = useState('All')
  const [series, setSeries] = useState('All')
  const [instockOnly, setInstockOnly] = useState(false)

  const brands = useMemo(() => ['All', ...new Set(CATALOG.map((item) => item.brand))], [])
  const ips = useMemo(
    () => ['All', ...new Set(CATALOG.filter((item) => brand === 'All' || item.brand === brand).map((item) => item.ip))],
    [brand],
  )
  const seriesOptions = useMemo(
    () => [
      'All',
      ...new Set(
        CATALOG.filter((item) => (brand === 'All' || item.brand === brand) && (ip === 'All' || item.ip === ip)).map(
          (item) => item.series,
        ),
      ),
    ],
    [brand, ip],
  )

  useEffect(() => {
    setIp('All')
    setSeries('All')
  }, [brand])
  useEffect(() => {
    setSeries('All')
  }, [ip])

  useEffect(() => {
    if (!filterOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  const filtered = useMemo(
    () =>
      posts.filter((post) => {
        const item = CATALOG.find((entry) => entry.id === post.itemId)
        if (!item) return false
        return (
          (!focusedItemId || post.itemId === focusedItemId) &&
          (tradeType === 'All' || post.type === tradeType) &&
          (brand === 'All' || item.brand === brand) &&
          (ip === 'All' || item.ip === ip) &&
          (series === 'All' || item.series === series) &&
          (!instockOnly || post.instock) &&
          matchesSearch(post, item, query)
        )
      }),
    [posts, focusedItemId, tradeType, brand, ip, series, instockOnly, query],
  )

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (priceOrder !== 'none') {
      return list.toSorted((a, b) => (priceOrder === 'asc' ? a.price - b.price : b.price - a.price))
    }
    return list.toSorted((a, b) =>
      timeOrder === 'newest' ? (b.postedAt ?? 0) - (a.postedAt ?? 0) : (a.postedAt ?? 0) - (b.postedAt ?? 0),
    )
  }, [filtered, priceOrder, timeOrder])

  const typeLabel = (v) => (v === 'All' ? t.market.typeAll : postTypeLabel(v))

  const filterActive = hasNonDefaultFilters({
    tradeType,
    brand,
    ip,
    series,
    instockOnly,
    priceOrder,
    timeOrder,
  })

  const sheet = filterOpen
    ? createPortal(
        <div className="market-sheet-root">
          <button type="button" className="market-sheet-backdrop" aria-label={t.market.closeSheet} onClick={() => setFilterOpen(false)} />
          <div
            className="market-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-filter-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="market-sheet-grab" aria-hidden />
            <header className="market-sheet-header">
              <h3 id="market-filter-sheet-title">{t.market.filterSheetTitle}</h3>
              <button type="button" className="market-sheet-done" onClick={() => setFilterOpen(false)}>
                {t.market.filterDone}
              </button>
            </header>
            <div className="market-sheet-scroll">
              <article className="panel market-tools market-tools--in-sheet">
                <p className="market-tools-section-title">{t.market.sectionTime}</p>
                <div className="sort-buttons">
                  <button
                    type="button"
                    className={priceOrder === 'none' && timeOrder === 'newest' ? 'active' : ''}
                    onClick={() => {
                      setTimeOrder('newest')
                      setPriceOrder('none')
                    }}
                  >
                    <Clock3 size={14} />
                    {t.market.timeNewest}
                  </button>
                  <button
                    type="button"
                    className={priceOrder === 'none' && timeOrder === 'oldest' ? 'active' : ''}
                    onClick={() => {
                      setTimeOrder('oldest')
                      setPriceOrder('none')
                    }}
                  >
                    <Clock3 size={14} />
                    {t.market.timeOldest}
                  </button>
                </div>

                <p className="market-tools-section-title">{t.market.sectionPrice}</p>
                <div className="sort-buttons">
                  <button type="button" className={priceOrder === 'none' ? 'active' : ''} onClick={() => setPriceOrder('none')}>
                    <Clock3 size={14} />
                    {t.market.priceOff}
                  </button>
                  <button type="button" className={priceOrder === 'asc' ? 'active' : ''} onClick={() => setPriceOrder('asc')}>
                    <ArrowDownWideNarrow size={14} />
                    {t.market.priceAsc}
                  </button>
                  <button type="button" className={priceOrder === 'desc' ? 'active' : ''} onClick={() => setPriceOrder('desc')}>
                    <ArrowUpWideNarrow size={14} />
                    {t.market.priceDesc}
                  </button>
                </div>

                <hr className="market-tools-divider" />

                <p className="market-tools-section-title">{t.market.sectionDetail}</p>
                <div className="carousel-stack market-detail-rows">
                  <CarouselRow label={t.market.filterType} value={tradeType} setter={setTradeType} options={TRADE_TYPES} formatOption={typeLabel} />
                  <CarouselRow label={t.market.filterBrand} value={brand} setter={setBrand} options={brands} formatOption={optAll} />
                  <CarouselRow label={t.market.filterIp} value={ip} setter={setIp} options={ips} formatOption={optAll} />
                  <CarouselRow label={t.market.filterSeries} value={series} setter={setSeries} options={seriesOptions} formatOption={optAll} />
                </div>
                <label className="market-instock-row">
                  <input type="checkbox" checked={instockOnly} onChange={(event) => setInstockOnly(event.target.checked)} />
                  {t.market.instockOnly}
                </label>
              </article>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <section className="page page-market page-market--browse">
      <div className="market-intro-compact">
        <h2>{t.market.title}</h2>
        <p className="sub">{t.market.tagline}</p>
      </div>

      <div className="market-toolbar-row">
        <div className="market-search-wrap">
          <Search size={16} strokeWidth={2} className="market-search-icon-muted" aria-hidden />
          <input
            type="search"
            className="market-search-input-plain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.market.searchPlaceholder}
            enterKeyHint="search"
          />
        </div>
        <button
          type="button"
          className={`market-filter-trigger${filterActive ? ' has-badge' : ''}`}
          onClick={() => setFilterOpen(true)}
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />
          <span>{t.market.filterTrigger}</span>
        </button>
      </div>

      <div className="market-waterfall">
        {sorted.length === 0 ? (
          <p className="market-empty">{t.market.empty}</p>
        ) : (
          sorted.map((post) => {
            const item = CATALOG.find((entry) => entry.id === post.itemId)
            const img = post.listingImage || item.image
            return (
              <Link key={post.id} to={`/market/post/${post.id}`} className="market-note-link">
                <article className="market-note-card">
                  <div className="market-note-cover">
                    <img src={img} alt="" loading="lazy" />
                  </div>
                  <div className="market-note-body">
                    <p className="market-note-title">{item.item}</p>
                    <div className="market-note-foot">
                      <span className="market-note-price">NT${post.price}</span>
                      <span className="market-note-pill">{postTypeLabel(post.type)}</span>
                    </div>
                    <p className="market-note-sub">
                      {post.seller} · {t.market.avgHint} {averagePrice(item.id)}
                    </p>
                  </div>
                </article>
              </Link>
            )
          })
        )}
      </div>

      {sheet}
      <MarketFAB />
    </section>
  )
}
