import popmartCollection from './popmart-collection-10.json'

export function inferIp(title = '') {
  const clean = title.trim()
  if (clean.startsWith('THE MONSTERS')) return 'THE MONSTERS'
  if (clean.startsWith('Hirono')) return 'Hirono'
  if (clean.startsWith('Star Wars')) return 'Star Wars'
  if (clean.startsWith('NARUTO')) return 'NARUTO'
  if (clean.startsWith('SKULLPANDA')) return 'SKULLPANDA'
  const firstWord = clean.split(' ')[0]
  return firstWord || 'Pop Mart'
}

export function normalizeScrapedImage(url, index) {
  const clean = (url || '').trim()
  if (!clean || clean.includes('xxx')) {
    return `https://placehold.co/120x120/fef2f2/9f1239?text=PM${index + 1}`
  }
  return clean.startsWith('//') ? `https:${clean}` : clean
}

const BASE_CATALOG = [
  { id: 'pm-crylb', brand: 'Pop Mart', ip: 'CRYBABY', series: 'Cheer Up, Baby!', item: 'Confetti Joy', rarity: '一般款', officialPrice: 380, releaseDate: '2026-03-10', marketLow: 420, marketAvg: 480, image: 'https://placehold.co/120x120/fde6e6/9f1239?text=PM' },
  { id: 'pm-labubu', brand: 'Pop Mart', ip: 'The Monsters', series: 'Have a Seat', item: 'Labubu (Secret)', rarity: '隱藏款', officialPrice: 380, releaseDate: '2026-02-01', marketLow: 1800, marketAvg: 2100, image: 'https://placehold.co/120x120/fee2e2/991b1b?text=LB' },
  { id: 'sa-angel', brand: 'Sonny Angel', ip: 'Animal Series', series: 'Animal v4', item: 'Fawn', rarity: '一般款', officialPrice: 320, releaseDate: '2025-12-03', marketLow: 350, marketAvg: 410, image: 'https://placehold.co/120x120/fef3c7/92400e?text=SA' },
  { id: 'sr-kitty', brand: 'Sanrio', ip: 'Hello Kitty', series: 'Sweet Dessert', item: 'Macaron Kitty', rarity: '特殊款', officialPrice: 350, releaseDate: '2026-01-15', marketLow: 430, marketAvg: 520, image: 'https://placehold.co/120x120/fce7f3/9d174d?text=HK' },
  { id: 'tt-pikachu', brand: 'TopToy', ip: 'Pokemon', series: 'Neon Arcade', item: 'Pikachu', rarity: '一般款', officialPrice: 300, releaseDate: '2025-11-01', marketLow: 320, marketAvg: 365, image: 'https://placehold.co/120x120/ecfeff/155e75?text=PK' },
  { id: 'pm-skull1', brand: 'Pop Mart', ip: 'Skullpanda', series: 'City of Night', item: 'Midnight Pilot', rarity: '特殊款', officialPrice: 420, releaseDate: '2026-04-08', marketLow: 560, marketAvg: 620, image: 'https://placehold.co/120x120/fef2f2/7f1d1d?text=SP' },
  { id: 'pm-skull2', brand: 'Pop Mart', ip: 'Skullpanda', series: 'City of Night', item: 'Neon Rider', rarity: '一般款', officialPrice: 420, releaseDate: '2026-04-08', marketLow: 430, marketAvg: 495, image: 'https://placehold.co/120x120/fff1f2/9f1239?text=NR' },
  { id: 'sr-cinna', brand: 'Sanrio', ip: 'Cinnamoroll', series: 'Cloud Dessert', item: 'Cream Cloud', rarity: '一般款', officialPrice: 340, releaseDate: '2026-03-22', marketLow: 370, marketAvg: 420, image: 'https://placehold.co/120x120/ecfeff/0e7490?text=CN' },
  { id: 'tt-eevee', brand: 'TopToy', ip: 'Pokemon', series: 'Neon Arcade', item: 'Eevee', rarity: '一般款', officialPrice: 300, releaseDate: '2025-11-01', marketLow: 315, marketAvg: 355, image: 'https://placehold.co/120x120/fef3c7/92400e?text=EV' },
  { id: 'sa-rabbit', brand: 'Sonny Angel', ip: 'Animal Series', series: 'Animal v4', item: 'Rabbit', rarity: '一般款', officialPrice: 320, releaseDate: '2025-12-03', marketLow: 360, marketAvg: 405, image: 'https://placehold.co/120x120/fff7ed/b45309?text=RB' },
]

const SCRAPED_CATALOG = popmartCollection.map((entry, index) => ({
  id: `pm-live-${index + 1}`,
  brand: 'Pop Mart',
  ip: inferIp(entry.title),
  series: entry.series || entry.title || '系列',
  item: entry.title || `Pop Mart 單品 ${index + 1}`,
  rarity: '一般款',
  officialPrice: 0,
  releaseDate: '2026-04-25',
  marketLow: 0,
  marketAvg: 0,
  image: normalizeScrapedImage(entry.image, index),
}))

export const CATALOG = [...BASE_CATALOG, ...SCRAPED_CATALOG]

/** @type {Array<{id:string,itemId:string,type:string,price:number,stock:number,condition:string,description:string,fulfillment:'Spot'|'Preorder',eta:string,seller:string,instock:boolean,listingImage?:string|null}>} */
export const MARKET_POSTS_SEED = [
  { id: 'p1', itemId: 'pm-labubu', type: 'Sell', price: 1980, stock: 1, condition: '拆盒未拆袋', description: '盒卡齊，可併單', fulfillment: 'Spot', eta: '1～2 天內寄出', seller: 'Kevin', instock: true, listingImage: null },
  { id: 'p2', itemId: 'pm-crylb', type: 'Exchange', price: 470, stock: 1, condition: '未拆盒', description: '想換 Skullpanda 系列', fulfillment: 'Spot', eta: '本週可面交', seller: 'Luna', instock: true, listingImage: null },
  { id: 'p3', itemId: 'sr-kitty', type: 'Buy Request', price: 450, stock: 1, condition: '不拘', description: '塗裝乾淨佳', fulfillment: 'Spot', eta: '可立即匯款', seller: 'Amy', instock: false, listingImage: null },
  { id: 'p4', itemId: 'tt-pikachu', type: 'Sell', price: 335, stock: 2, condition: '已拆展示', description: '無瑕疵，附卡', fulfillment: 'Spot', eta: '24 小時內寄出', seller: 'Anson', instock: true, listingImage: null },
  { id: 'p5', itemId: 'pm-skull1', type: 'Sell', price: 645, stock: 1, condition: '未拆盒', description: '近全新，可視訊驗貨', fulfillment: 'Preorder', eta: '預計 2026-05-03 出貨', seller: 'Yuki', instock: true, listingImage: null },
  { id: 'p6', itemId: 'pm-skull2', type: 'Exchange', price: 480, stock: 1, condition: '拆盒未拆袋', description: '想換 Cream Cloud', fulfillment: 'Spot', eta: '2 天內寄出', seller: 'Nick', instock: true, listingImage: null },
  { id: 'p7', itemId: 'sr-cinna', type: 'Sell', price: 415, stock: 3, condition: '未拆盒', description: '三隻可議價', fulfillment: 'Spot', eta: '1 天內寄出', seller: 'Mia', instock: true, listingImage: null },
  { id: 'p8', itemId: 'sa-rabbit', type: 'Buy Request', price: 390, stock: 1, condition: '不拘', description: '生日前需要', fulfillment: 'Spot', eta: '越快越好', seller: 'Sora', instock: false, listingImage: null },
  { id: 'p9', itemId: 'tt-eevee', type: 'Sell', price: 350, stock: 4, condition: '已拆展示', description: '逐隻檢查塗裝', fulfillment: 'Spot', eta: '24 小時內寄出', seller: 'Terry', instock: true, listingImage: null },
]

export const SELLING_POST_IDS = ['p1', 'p4', 'p7', 'p9']
export const HAVES = ['Labubu (Secret)', 'Macaron Kitty', 'Fawn', 'Eevee']
export const WANTS = ['Pikachu', 'Confetti Joy', 'Labubu (Secret)', 'Midnight Pilot']
export const CART_PLANS = [
  { id: 'cp1', itemId: 'pm-labubu', fairPrice: 1900, preferredSeller: 'Kevin', sellerScore: 4.8 },
  { id: 'cp2', itemId: 'pm-skull1', fairPrice: 610, preferredSeller: 'Yuki', sellerScore: 4.7 },
  { id: 'cp3', itemId: 'sr-cinna', fairPrice: 400, preferredSeller: 'Mia', sellerScore: 4.9 },
]

export const SPLIT_POOL = [
  { series: 'Cheer Up, Baby!', required: 6, joined: 5 },
  { series: 'Neon Arcade', required: 8, joined: 8 },
]

export const PURCHASE_HISTORY = [
  { id: 'o1', item: 'Confetti Joy', date: '2026-04-02', amount: 455, status: '已送達' },
  { id: 'o2', item: 'Pikachu', date: '2026-03-17', amount: 350, status: '已送達' },
  { id: 'o3', item: 'Cream Cloud', date: '2026-04-19', amount: 418, status: '已送達' },
  { id: 'o4', item: 'Rabbit', date: '2026-04-21', amount: 398, status: '配送中' },
]

export const WISHLIST_ITEMS = ['Labubu (Secret)', 'Macaron Kitty', 'Midnight Pilot', 'Neon Rider', 'Cream Cloud']

export const LATEST_RELEASES = [
  { series: 'Dimoo Space Travel', brand: 'Pop Mart', date: '2026-04-18' },
  { series: 'Sanrio Sweet Dessert', brand: 'Sanrio', date: '2026-04-16' },
  { series: 'Skullpanda City of Night', brand: 'Pop Mart', date: '2026-04-08' },
]

export const TRADE_HISTORY = {
  'pm-crylb': [{ date: '2026-03-12', price: 440 }, { date: '2026-03-18', price: 455 }, { date: '2026-03-27', price: 470 }, { date: '2026-04-05', price: 480 }, { date: '2026-04-20', price: 465 }],
  'pm-labubu': [{ date: '2026-03-02', price: 1950 }, { date: '2026-03-15', price: 2050 }, { date: '2026-03-30', price: 2100 }, { date: '2026-04-10', price: 2250 }, { date: '2026-04-22', price: 2000 }],
  'sa-angel': [{ date: '2026-02-28', price: 360 }, { date: '2026-03-11', price: 380 }, { date: '2026-03-28', price: 390 }, { date: '2026-04-14', price: 405 }, { date: '2026-04-23', price: 410 }],
  'sr-kitty': [{ date: '2026-02-19', price: 430 }, { date: '2026-03-08', price: 450 }, { date: '2026-03-21', price: 470 }, { date: '2026-04-06', price: 520 }, { date: '2026-04-24', price: 510 }],
  'tt-pikachu': [{ date: '2026-02-15', price: 310 }, { date: '2026-03-02', price: 325 }, { date: '2026-03-17', price: 335 }, { date: '2026-04-04', price: 360 }, { date: '2026-04-21', price: 345 }],
  'pm-skull1': [{ date: '2026-04-01', price: 560 }, { date: '2026-04-06', price: 580 }, { date: '2026-04-12', price: 610 }, { date: '2026-04-19', price: 645 }, { date: '2026-04-24', price: 620 }],
  'pm-skull2': [{ date: '2026-04-01', price: 440 }, { date: '2026-04-07', price: 460 }, { date: '2026-04-13', price: 470 }, { date: '2026-04-18', price: 490 }, { date: '2026-04-24', price: 510 }],
  'sr-cinna': [{ date: '2026-03-24', price: 360 }, { date: '2026-03-31', price: 380 }, { date: '2026-04-09', price: 410 }, { date: '2026-04-17', price: 430 }, { date: '2026-04-23', price: 420 }],
  'tt-eevee': [{ date: '2026-02-14', price: 305 }, { date: '2026-03-03', price: 320 }, { date: '2026-03-16', price: 335 }, { date: '2026-04-07', price: 360 }, { date: '2026-04-20', price: 355 }],
  'sa-rabbit': [{ date: '2026-03-01', price: 350 }, { date: '2026-03-18', price: 370 }, { date: '2026-04-02', price: 385 }, { date: '2026-04-15', price: 410 }, { date: '2026-04-23', price: 405 }],
}

export const CHATS = [
  { id: 'c1', with: 'Kevin（賣家）', item: 'Labubu (Secret)', last: '明天可以寄出喔' },
  { id: 'c2', with: 'Mia（買家）', item: 'Confetti Joy', last: '能跟 Fawn 一起併嗎？' },
]

export const NOTIFICATIONS = [
  { id: 'n1', title: '降價小鈴鐺', body: 'Labubu (Secret) 降到 NT$ 1880 啦', time: '2 分鐘前' },
  { id: 'n2', title: '新上架符合', body: 'Neon Rider 剛上架市集', time: '14 分鐘前' },
]

export const CHAT_MESSAGES = {
  c1: [
    { fromMe: false, text: '嗨，請問秘密款還在嗎？', time: '10:22' },
    { fromMe: true, text: '在喔！明天方便寄出嗎？', time: '10:24' },
  ],
  c2: [
    { fromMe: false, text: 'Confetti Joy 能跟 Fawn 一起出嗎？', time: '09:18' },
    { fromMe: true, text: '可以呀，組合價我算給你～', time: '09:21' },
  ],
}

export function averagePrice(itemId) {
  const history = TRADE_HISTORY[itemId] ?? []
  if (history.length === 0) return 0
  return Math.round(history.reduce((acc, value) => acc + value.price, 0) / history.length)
}
