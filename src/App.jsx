import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BookImage,
  ChartNoAxesColumn,
  ChevronRight,
  CirclePlus,
  Clock3,
  Heart,
  MessageCircle,
  PackageCheck,
  Pencil,
  Repeat2,
  Shuffle,
  Sparkles,
  Store,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { AppLayout } from './components/AppLayout.jsx'
import { MarketPage } from './components/market/MarketPage.jsx'
import { PriceLineChart } from './components/charts/PriceLineChart.jsx'
import { BackButton, Card, CarouselRow, Filter, NavMini } from './components/ui/FormBits.jsx'
import {
  CART_PLANS,
  CATALOG,
  CHATS,
  CHAT_MESSAGES,
  HAVES,
  LATEST_RELEASES,
  NOTIFICATIONS,
  PURCHASE_HISTORY,
  SELLING_POST_IDS,
  SPLIT_POOL,
  TRADE_HISTORY,
  WANTS,
  WISHLIST_ITEMS,
  averagePrice,
} from './data/appData'
import { usePosts } from './context/PostsContext.jsx'
import { useProfile } from './context/ProfileContext.jsx'
import { fulfillmentLabel, postTypeLabel, t } from './i18n/zh-TW'

function HomePage() {
  const newest = [...CATALOG].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 3)
  return (
    <section className="page">
      <article className="hero-card">
        <p className="chip">
          <Sparkles size={14} />
          {t.home.chip}
        </p>
        <h2>{t.home.hero}</h2>
        <div className="release-banner">
          <p className="release-title">{t.home.releasesTitle}</p>
          {LATEST_RELEASES.map((release) => (
            <div key={release.series} className="release-row">
              <span>
                {release.brand} · {release.series}
              </span>
              <small>{release.date}</small>
            </div>
          ))}
        </div>
      </article>
      <h3>{t.home.quickOps}</h3>
      <div className="ops-grid">
        <NavMini to="/collection" icon={<BookImage size={16} />} title={t.home.ops.encyclopedia} />
        <NavMini to="/collection" icon={<WalletCards size={16} />} title={t.home.ops.cart} />
        <NavMini to="/market/new" icon={<Store size={16} />} title={t.home.ops.sellPost} />
        <NavMini to="/exchange" icon={<Repeat2 size={16} />} title={t.home.ops.exchange} />
        <NavMini to="/split" icon={<Shuffle size={16} />} title={t.home.ops.split} />
      </div>
      <h3>{t.home.newestTitle}</h3>
      <div className="album-grid">
        {newest.map((item) => (
          <Link key={item.id} to={`/item/${item.id}`} className="album-card-link">
            <article className="album-card">
              <img src={item.image} alt={item.item} loading="lazy" />
              <h3>{item.item}</h3>
              <p>{item.releaseDate}</p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CollectionPage() {
  const [mode, setMode] = useState('encyclopedia')
  const [brand, setBrand] = useState('All')
  const [ip, setIp] = useState('All')
  const [series, setSeries] = useState('All')
  const [sortBy, setSortBy] = useState('date-desc')
  const brands = ['All', ...new Set(CATALOG.map((item) => item.brand))]
  const ips = ['All', ...new Set(CATALOG.filter((item) => brand === 'All' || item.brand === brand).map((item) => item.ip))]
  const seriesOptions = [
    'All',
    ...new Set(CATALOG.filter((item) => (brand === 'All' || item.brand === brand) && (ip === 'All' || item.ip === ip)).map((item) => item.series)),
  ]
  useEffect(() => {
    setIp('All')
    setSeries('All')
  }, [brand])
  useEffect(() => {
    setSeries('All')
  }, [ip])
  const filtered = useMemo(() => {
    const dataset = CATALOG.filter(
      (item) => (brand === 'All' || item.brand === brand) && (ip === 'All' || item.ip === ip) && (series === 'All' || item.series === series),
    )
    return dataset.toSorted((a, b) => {
      if (sortBy === 'date-desc') return b.releaseDate.localeCompare(a.releaseDate)
      if (sortBy === 'date-asc') return a.releaseDate.localeCompare(b.releaseDate)
      if (sortBy === 'price-desc') return b.marketAvg - a.marketAvg
      return a.marketAvg - b.marketAvg
    })
  }, [brand, ip, series, sortBy])
  return (
    <section className="page">
      <div className="collection-head">
        <h2>{t.collection.title}</h2>
        <p className="sub">{t.collection.sub}</p>
      </div>
      <div className="binder-tabs">
        <button type="button" className={mode === 'encyclopedia' ? 'active' : ''} onClick={() => setMode('encyclopedia')}>
          {t.collection.tabEncyclopedia}
        </button>
        <button type="button" className={mode === 'mine' ? 'active' : ''} onClick={() => setMode('mine')}>
          {t.collection.tabMine}
        </button>
        <button type="button" className={mode === 'cart' ? 'active' : ''} onClick={() => setMode('cart')}>
          {t.collection.tabCart}
        </button>
      </div>
      {mode === 'encyclopedia' ? (
        <>
          <div className="carousel-stack">
            <CarouselRow label={t.collection.brand} value={brand} setter={setBrand} options={brands} />
            <CarouselRow label={t.collection.ip} value={ip} setter={setIp} options={ips} />
            <CarouselRow label={t.collection.series} value={series} setter={setSeries} options={seriesOptions} />
          </div>
          <div className="sort-buttons">
            {[
              ['date-desc', t.collection.sortNewest],
              ['date-asc', t.collection.sortOldest],
              ['price-desc', t.collection.sortPriceHigh],
              ['price-asc', t.collection.sortPriceLow],
            ].map(([key, label]) => (
              <button key={key} type="button" className={sortBy === key ? 'active' : ''} onClick={() => setSortBy(key)}>
                <Clock3 size={14} />
                {label}
              </button>
            ))}
          </div>
          <div className="album-grid">
            {filtered.map((item) => (
              <Link key={item.id} to={`/item/${item.id}`} className="album-card-link">
                <article className="album-card">
                  <img src={item.image} alt={item.item} loading="lazy" />
                  <h3>{item.item}</h3>
                  <p>{item.series}</p>
                  <div className="meta-inline">
                    <span>{item.rarity}</span>
                    <span>NT$ {item.marketAvg}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </>
      ) : mode === 'mine' ? (
        <MyCollectionPanel />
      ) : (
        <CartPlannerPanel />
      )}
    </section>
  )
}

function MarketPostDetailPage() {
  const { postId } = useParams()
  const { findPost } = usePosts()
  const post = findPost(postId)
  if (!post) return <section className="page">{t.post.notFound}</section>
  const item = CATALOG.find((entry) => entry.id === post.itemId)
  const history = TRADE_HISTORY[item.id] ?? []
  const img = post.listingImage || item.image
  return (
    <section className="page">
      <BackButton to="/market" label={t.post.backMarket} />
      <h2>{t.post.detailTitle}</h2>
      <article className="listing-card">
        <img src={img} alt={item.item} />
        <div>
          <h3>{item.item}</h3>
          <p>
            {item.brand} · {item.series}
          </p>
        </div>
      </article>
      <article className="panel">
        <p>
          <strong>{t.post.price}：</strong> NT$ {post.price}
        </p>
        <p>
          <strong>{t.post.stock}：</strong> {post.stock}
        </p>
        <p>
          <strong>{t.post.desc}：</strong> {post.description}
        </p>
        <p>
          <strong>{t.post.fulfillment}：</strong> {fulfillmentLabel(post.fulfillment)}
        </p>
        <p>
          <strong>{t.post.eta}：</strong> {post.eta}
        </p>
      </article>
      <PriceHistoryCard history={history} itemId={item.id} />
    </section>
  )
}

function useObjectUrl(file) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) {
      setUrl('')
      return undefined
    }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

function MarketCreatePostPage() {
  const navigate = useNavigate()
  const { addPost } = usePosts()
  const { displayName } = useProfile()
  const [postTitle, setPostTitle] = useState('秘密款 Labubu · 近全新')
  const [itemId, setItemId] = useState(CATALOG[0].id)
  const [price, setPrice] = useState('500')
  const [stock, setStock] = useState('1')
  const [description, setDescription] = useState('盒卡齊，誠可小議～')
  const [fulfillment, setFulfillment] = useState('Spot')
  const [eta, setEta] = useState('1～2 天內寄出')
  const [condition, setCondition] = useState('未拆盒')
  const [photoFile, setPhotoFile] = useState(null)
  const listingPreview = useObjectUrl(photoFile)
  const item = CATALOG.find((entry) => entry.id === itemId)

  return (
    <section className="page">
      <BackButton to="/market" label={t.post.backMarket} />
      <h2>{t.post.newTitle}</h2>
      <article className="post-composer">
        <div className="composer-head">
          <CirclePlus size={18} />
          <strong>{t.post.composer}</strong>
        </div>
        <label className="form-line">
          {t.post.postTitle}
          <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder={t.post.postTitlePh} />
        </label>
        <Filter
          label={t.post.linkItem}
          value={itemId}
          setter={setItemId}
          options={CATALOG.map((entry) => entry.id)}
          formatOption={(id) => CATALOG.find((e) => e.id === id)?.item ?? id}
        />
        <div className="panel" style={{ marginTop: '0.5rem' }}>
          <p className="sub" style={{ marginBottom: '0.5rem' }}>
            {t.post.photoHint}
          </p>
          <div className="photo-upload-row">
            {listingPreview ? <img src={listingPreview} alt="" className="upload-preview" /> : null}
            <label className="action-btn" style={{ cursor: 'pointer', display: 'inline-flex', width: 'fit-content' }}>
              <span>{listingPreview ? t.post.changePhoto : t.post.uploadPhoto}</span>
              <input type="file" accept="image/*" className="sr-only-file" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <label className="form-line">
          {t.post.price}
          <input value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
        <label className="form-line">
          {t.post.stock}
          <input value={stock} onChange={(event) => setStock(event.target.value)} />
        </label>
        <label className="form-line">
          {t.post.condition}
          <input value={condition} onChange={(event) => setCondition(event.target.value)} />
        </label>
        <label className="form-line">
          {t.post.desc}
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <Filter label={t.post.fulfillment} value={fulfillment} setter={setFulfillment} options={['Spot', 'Preorder']} formatOption={(k) => fulfillmentLabel(k)} />
        <label className="form-line">
          {t.post.eta}
          <input value={eta} onChange={(event) => setEta(event.target.value)} />
        </label>
        <button
          type="button"
          className="action-btn"
          onClick={() => {
            addPost({
              itemId,
              type: 'Sell',
              price: Number(price) || 0,
              stock: Number(stock) || 0,
              condition,
              description,
              fulfillment,
              eta,
              seller: displayName,
              instock: fulfillment === 'Spot',
              listingImage: listingPreview || null,
            })
            navigate('/market')
          }}
        >
          <CirclePlus size={15} />
          {t.post.publish}
        </button>
      </article>
      <article className="panel">
        <h3>{t.post.preview}</h3>
        <p>
          <strong>{t.post.postTitle}：</strong> {postTitle}
        </p>
        <p>
          <strong>{t.post.itemName}：</strong> {item.item}
        </p>
        <p>
          <strong>{t.post.price}：</strong> NT$ {price}
        </p>
        <p>
          <strong>{t.post.stock}：</strong> {stock}
        </p>
        <p>
          <strong>{t.post.desc}：</strong> {description}
        </p>
        <p>
          <strong>{t.post.fulfillment}：</strong> {fulfillmentLabel(fulfillment)}（{eta}）
        </p>
      </article>
    </section>
  )
}

function ExchangePage() {
  const matches = WANTS.filter((wanted) => HAVES.includes(wanted))
  return (
    <section className="page">
      <h2>{t.exchange.title}</h2>
      <div className="grid">
        <Card title={t.exchange.have} value={HAVES.join('、')} />
        <Card title={t.exchange.want} value={WANTS.join('、')} />
      </div>
      <h3>{t.exchange.recTitle}</h3>
      {matches.map((item) => (
        <div key={item} className="row-card">
          <strong>{item}</strong>
          <p>{t.exchange.matchLine}</p>
        </div>
      ))}
    </section>
  )
}

function SplitPage() {
  return (
    <section className="page">
      <h2>{t.split.title}</h2>
      {SPLIT_POOL.map((pool) => (
        <article key={pool.series} className="listing-card">
          <div className={`pill ${pool.joined >= pool.required ? 'ok' : ''}`}>{pool.joined >= pool.required ? t.split.ready : t.split.waiting}</div>
          <div>
            <h3>{pool.series}</h3>
            <p>
              {t.split.joined} {pool.joined}/{pool.required}
            </p>
          </div>
        </article>
      ))}
    </section>
  )
}

function ProfilePage() {
  const { posts } = usePosts()
  const { displayName, avatarUrl, avatarLetter } = useProfile()
  const sellingPosts = posts.filter((post) => SELLING_POST_IDS.includes(post.id))
  const onSale = sellingPosts.filter((post) => post.type === 'Sell').length
  const inProgress = sellingPosts.filter((post) => post.fulfillment === 'Preorder').length
  return (
    <section className="page">
      <h2>{t.profile.title}</h2>
      <Link to="/profile/edit" className="profile-head profile-link">
        <div className="avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" className="avatar-img" /> : avatarLetter.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{displayName}</strong>
          <p className="sub">{t.profile.sub}</p>
        </div>
        <ChevronRight size={16} />
      </Link>
      <article className="panel">
        <h3>{t.profile.dashboard}</h3>
        <div className="grid">
          <Card title={t.profile.cardOnSale} value={`${onSale}`} />
          <Card title={t.profile.cardPreorder} value={`${inProgress}`} />
          <Card title={t.profile.cardPurchased} value={`${PURCHASE_HISTORY.length}`} />
          <Card title={t.profile.cardWishlist} value={`${WISHLIST_ITEMS.length}`} />
        </div>
      </article>
      <NavMini to="/profile/wishlist" icon={<Heart size={16} />} title={t.profile.wishlistNav} />
      <NavMini to="/profile/purchases" icon={<PackageCheck size={16} />} title={t.profile.purchasesNav} />
      <NavMini to="/profile/sales" icon={<Store size={16} />} title={t.profile.salesNav} />
    </section>
  )
}

function ProfileEditPage() {
  const navigate = useNavigate()
  const { displayName, setDisplayName, avatarUrl, setAvatarUrl, avatarLetter, setAvatarLetter } = useProfile()
  const [name, setName] = useState(displayName)
  const [letter, setLetter] = useState(avatarLetter)
  const [file, setFile] = useState(null)
  const preview = useObjectUrl(file)
  const prevBlobRef = useRef('')

  useEffect(() => {
    if (avatarUrl?.startsWith('blob:')) prevBlobRef.current = avatarUrl
  }, [avatarUrl])

  return (
    <section className="page">
      <BackButton to="/profile" label={t.backProfile} />
      <h2>{t.profile.edit}</h2>
      <article className="panel">
        <p className="sub" style={{ marginBottom: '0.5rem' }}>
          {t.profile.avatarHint}
        </p>
        <div className="photo-upload-row">
          {(preview || avatarUrl) ? (
            <img src={preview || avatarUrl} alt="" className="upload-preview upload-preview--round" />
          ) : (
            <div className="avatar" style={{ width: 88, height: 88, fontSize: '1.6rem' }}>
              {letter.slice(0, 1).toUpperCase()}
            </div>
          )}
          <label className="action-btn" style={{ cursor: 'pointer', display: 'inline-flex', width: 'fit-content' }}>
            <span>{t.profile.avatarUpload}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only-file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setFile(f ?? null)
              }}
            />
          </label>
        </div>
        <label className="form-line">
          {t.profile.letterFallback}
          <input value={letter} maxLength={1} onChange={(event) => setLetter(event.target.value.toUpperCase())} />
        </label>
        <label className="form-line">
          {t.profile.displayName}
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button
          type="button"
          className="action-btn"
          onClick={() => {
            if (prevBlobRef.current && prevBlobRef.current !== preview) URL.revokeObjectURL(prevBlobRef.current)
            setDisplayName(name)
            setAvatarLetter(letter)
            if (preview) setAvatarUrl(preview)
            setFile(null)
            navigate('/profile')
          }}
        >
          {t.profile.save}
        </button>
      </article>
    </section>
  )
}

function WishlistPage() {
  return (
    <section className="page">
      <BackButton to="/profile" label={t.backProfile} />
      <h2>{t.wishlist.title}</h2>
      <div className="album-grid">
        {CATALOG.filter((item) => WISHLIST_ITEMS.includes(item.item)).map((item) => (
          <Link key={item.id} to={`/item/${item.id}`} className="album-card-link">
            <article className="album-card">
              <img src={item.image} alt={item.item} loading="lazy" />
              <h3>{item.item}</h3>
              <p>{item.series}</p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}

function PurchasesPage() {
  return (
    <section className="page">
      <BackButton to="/profile" label={t.backProfile} />
      <h2>{t.purchases.title}</h2>
      {PURCHASE_HISTORY.map((entry) => (
        <article key={entry.id} className="row-card">
          <div>
            <strong>{entry.item}</strong>
            <p>
              {entry.date} · {entry.status}
            </p>
          </div>
          <span className="price">NT$ {entry.amount}</span>
        </article>
      ))}
    </section>
  )
}

function SalesPage() {
  const { posts } = usePosts()
  const list = posts.filter((post) => SELLING_POST_IDS.includes(post.id)).toSorted((a, b) => Number(b.instock) - Number(a.instock))
  return (
    <section className="page">
      <BackButton to="/profile" label={t.backProfile} />
      <h2>{t.sales.title}</h2>
      {list.map((post) => {
        const item = CATALOG.find((entry) => entry.id === post.itemId)
        return (
          <Link key={post.id} to={`/profile/sales/${post.id}`} className="chat-link">
            <article className="row-card">
              <div>
                <strong>{item.item}</strong>
                <p>
                  NT$ {post.price} · {t.market.stock} {post.stock} · {post.fulfillment === 'Spot' ? t.market.spot : t.market.preorder}
                </p>
              </div>
              <ChevronRight size={16} />
            </article>
          </Link>
        )
      })}
    </section>
  )
}

function SalesDetailPage() {
  const { postId } = useParams()
  const { findPost } = usePosts()
  const post = findPost(postId)
  if (!post) return <section className="page">{t.post.notFound}</section>
  const item = CATALOG.find((entry) => entry.id === post.itemId)
  const img = post.listingImage || item.image
  return (
    <section className="page">
      <BackButton to="/profile/sales" label={t.backSales} />
      <h2>{t.post.saleDetailTitle}</h2>
      <Link to={`/profile/sales/${post.id}/edit`} className="action-btn">
        <Pencil size={14} />
        {t.post.editBtn}
      </Link>
      <article className="listing-card" style={{ marginTop: '0.6rem' }}>
        <img src={img} alt={item.item} />
        <div>
          <h3>{item.item}</h3>
          <p>{postTypeLabel(post.type)}</p>
        </div>
      </article>
      <article className="panel">
        <p>
          <strong>{t.post.itemName}：</strong> {item.item}
        </p>
        <p>
          <strong>{t.post.price}：</strong> NT$ {post.price}
        </p>
        <p>
          <strong>{t.post.instockLabel}：</strong> {post.stock}
        </p>
        <p>
          <strong>{t.post.desc}：</strong> {post.description}
        </p>
        <p>
          <strong>{t.post.fulfillment}：</strong> {fulfillmentLabel(post.fulfillment)}
        </p>
        <p>
          <strong>{t.post.eta}：</strong> {post.eta}
        </p>
      </article>
    </section>
  )
}

function SalesEditPage() {
  const navigate = useNavigate()
  const { postId } = useParams()
  const { findPost, updatePost } = usePosts()
  const post = findPost(postId)
  const [price, setPrice] = useState(post ? String(post.price) : '0')
  const [stock, setStock] = useState(post ? String(post.stock) : '0')
  const [description, setDescription] = useState(post?.description ?? '')
  const [fulfillment, setFulfillment] = useState(post?.fulfillment ?? 'Spot')
  const [eta, setEta] = useState(post?.eta ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const newPreview = useObjectUrl(photoFile)

  useEffect(() => {
    if (!post) return
    setPrice(String(post.price))
    setStock(String(post.stock))
    setDescription(post.description)
    setFulfillment(post.fulfillment)
    setEta(post.eta)
    setPhotoFile(null)
  }, [post])

  if (!post) return <section className="page">{t.post.notFound}</section>

  return (
    <section className="page">
      <BackButton to={`/profile/sales/${post.id}`} label={t.post.backDetail} />
      <h2>{t.post.editSale}</h2>
      <article className="panel">
        <p className="sub" style={{ marginBottom: '0.5rem' }}>
          {t.post.photoHint}
        </p>
        <div className="photo-upload-row">
          {(newPreview || post.listingImage) && <img src={newPreview || post.listingImage} alt="" className="upload-preview" />}
          <label className="action-btn" style={{ cursor: 'pointer', display: 'inline-flex', width: 'fit-content' }}>
            <span>{newPreview || post.listingImage ? t.post.changePhoto : t.post.uploadPhoto}</span>
            <input type="file" accept="image/*" className="sr-only-file" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <label className="form-line">
          {t.post.price}
          <input value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
        <label className="form-line">
          {t.post.stock}
          <input value={stock} onChange={(event) => setStock(event.target.value)} />
        </label>
        <label className="form-line">
          {t.post.desc}
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <Filter label={t.post.fulfillment} value={fulfillment} setter={setFulfillment} options={['Spot', 'Preorder']} formatOption={(k) => fulfillmentLabel(k)} />
        <label className="form-line">
          {t.post.eta}
          <input value={eta} onChange={(event) => setEta(event.target.value)} />
        </label>
        <button
          type="button"
          className="action-btn"
          onClick={() => {
            updatePost(post.id, {
              price: Number(price) || 0,
              stock: Number(stock) || 0,
              description,
              fulfillment,
              eta,
              ...(newPreview ? { listingImage: newPreview } : {}),
            })
            navigate(`/profile/sales/${post.id}`)
          }}
        >
          {t.post.saveMock}
        </button>
      </article>
    </section>
  )
}

function ItemDetailPage() {
  const { itemId } = useParams()
  const { posts } = usePosts()
  const item = CATALOG.find((entry) => entry.id === itemId)
  if (!item) return <section className="page">{t.item.notFound}</section>
  const itemPosts = posts.filter((entry) => entry.itemId === item.id && entry.type === 'Sell')
  const history = TRADE_HISTORY[item.id] ?? []
  return (
    <section className="page">
      <BackButton to="/collection" label={t.item.backCollection} />
      <h2>{item.item}</h2>
      <article className="listing-card">
        <img src={item.image} alt={item.item} />
        <div>
          <p>
            {item.brand} · {item.series}
          </p>
          <p>
            {t.item.official} {item.officialPrice}
          </p>
        </div>
      </article>
      <PriceHistoryCard history={history} itemId={item.id} />
      <article className="panel">
        <h3>{t.item.listingsTitle}</h3>
        {itemPosts.map((p) => (
          <Link key={p.id} to={`/market/post/${p.id}`} className="chat-link">
            <div className="row-card">
              <div>
                <strong>{p.condition}</strong>
                <p>
                  {fulfillmentLabel(p.fulfillment)} · {p.eta}
                </p>
              </div>
              <span className="price">NT$ {p.price}</span>
            </div>
          </Link>
        ))}
        <Link to={`/market?item=${item.id}`} className="action-btn">
          {t.item.viewInMarket}
        </Link>
      </article>
    </section>
  )
}

function PriceHistoryCard({ history, itemId }) {
  return (
    <article className="panel">
      <h3>
        <ChartNoAxesColumn size={16} /> {t.tradeHistory.title}
      </h3>
      <PriceLineChart points={history} />
      <p className="sub">
        {t.tradeHistory.avg}： NT$ {averagePrice(itemId)}
      </p>
      {history.map((entry) => (
        <p key={`${entry.date}-${entry.price}`} className="tiny">
          {entry.date} · NT$ {entry.price}
        </p>
      ))}
    </article>
  )
}

function MyCollectionPanel() {
  const owned = CATALOG.filter((item) => HAVES.includes(item.item))
  const wanted = CATALOG.filter((item) => WISHLIST_ITEMS.includes(item.item))
  return (
    <>
      <h3>{t.collection.have}</h3>
      <div className="album-grid">
        {owned.map((item) => (
          <Link key={item.id} to={`/item/${item.id}`} className="album-card-link">
            <article className="album-card">
              <img src={item.image} alt={item.item} loading="lazy" />
              <h3>{item.item}</h3>
              <p>{t.collection.owned}</p>
            </article>
          </Link>
        ))}
      </div>
      <h3>{t.collection.want}</h3>
      <div className="album-grid">
        {wanted.map((item) => (
          <Link key={item.id} to={`/item/${item.id}`} className="album-card-link">
            <article className="album-card">
              <img src={item.image} alt={item.item} loading="lazy" />
              <h3>{item.item}</h3>
              <p>{t.collection.wishlist}</p>
            </article>
          </Link>
        ))}
      </div>
    </>
  )
}

function CartPlannerPanel() {
  const { posts } = usePosts()
  return (
    <>
      <h3>{t.collection.cartTitle}</h3>
      {CART_PLANS.map((plan) => {
        const item = CATALOG.find((entry) => entry.id === plan.itemId)
        const bestPost = posts.filter((entry) => entry.itemId === plan.itemId && entry.type === 'Sell').toSorted((a, b) => a.price - b.price)[0]
        return (
          <Link key={plan.id} to={`/market/post/${bestPost?.id ?? 'p1'}`} className="chat-link">
            <article className="row-card">
              <div>
                <strong>{item.item}</strong>
                <p>
                  {t.collection.fairPrice} {plan.fairPrice} · {t.collection.seller} {plan.preferredSeller}（{plan.sellerScore}）
                </p>
                <p className="tiny">
                  {t.collection.bestNow} NT$ {bestPost?.price ?? '—'}
                </p>
              </div>
              <ChevronRight size={16} />
            </article>
          </Link>
        )
      })}
    </>
  )
}

function ChatPage() {
  return (
    <section className="page">
      <h2>{t.chat.title}</h2>
      <article className="panel">
        <h3>{t.chat.notif}</h3>
        {NOTIFICATIONS.map((item) => (
          <div key={item.id} className="row-card">
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
            <span className="tiny">{item.time}</span>
          </div>
        ))}
      </article>
      <h3>{t.chat.chats}</h3>
      {CHATS.map((chat) => (
        <Link to={`/chat/${chat.id}`} key={chat.id} className="chat-link">
          <article className="row-card chat-row">
            <div>
              <strong>{chat.with}</strong>
              <p>
                {chat.item} · {chat.last}
              </p>
            </div>
            <MessageCircle size={16} className="chat-row-icon" />
          </article>
        </Link>
      ))}
    </section>
  )
}

function ChatRoomPage() {
  const { chatId } = useParams()
  const [draft, setDraft] = useState('')
  const chat = CHATS.find((entry) => entry.id === chatId)
  const messages = CHAT_MESSAGES[chatId] ?? []
  return (
    <section className="chatroom-page">
      <div className="chatroom-top">
        <BackButton to="/chat" label={t.chat.back} />
        <h2>{chat ? chat.with : t.chat.roomFallback}</h2>
      </div>
      <article className="chatroom-messages">
        {messages.map((msg, index) => (
          <div key={`${chatId}-${index}`} className={`bubble ${msg.fromMe ? 'mine' : ''}`}>
            <p>{msg.text}</p>
            <small>{msg.time}</small>
          </div>
        ))}
      </article>
      <div className="chat-compose">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t.chat.placeholder} />
        <button type="button">{t.chat.send}</button>
      </div>
    </section>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/market/new" element={<MarketCreatePostPage />} />
          <Route path="/market/post/:postId" element={<MarketPostDetailPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChatRoomPage />} />
          <Route path="/item/:itemId" element={<ItemDetailPage />} />
          <Route path="/exchange" element={<ExchangePage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/profile/wishlist" element={<WishlistPage />} />
          <Route path="/profile/purchases" element={<PurchasesPage />} />
          <Route path="/profile/sales" element={<SalesPage />} />
          <Route path="/profile/sales/:postId" element={<SalesDetailPage />} />
          <Route path="/profile/sales/:postId/edit" element={<SalesEditPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
