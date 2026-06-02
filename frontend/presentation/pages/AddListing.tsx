import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { cn } from '@/frontend/shared/utils/cn';

const FIELD =
  'w-full rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-medium text-black placeholder:text-black/40 outline-none transition-shadow focus:border-black focus:ring-2 focus:ring-black/15';

const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-black ml-0.5';

const SECTION_TITLE = 'text-[10px] font-black uppercase tracking-widest text-black';

export default function AddListing() {
  const navigate = useNavigate();
  const { createListing } = useAppState();
  const { products } = useCatalogProducts();
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('POPMART 泡泡瑪特');
  const [series, setSeries] = useState('LABUBU The Monsters');
  const [condition, setCondition] = useState('全新未拆');
  const [tradeMode, setTradeMode] = useState('我要賣');
  const [allowSwap, setAllowSwap] = useState(true);
  const [allowBargain, setAllowBargain] = useState(false);
  const [shipping, setShipping] = useState('7-11 店到店');
  const [query, setQuery] = useState('');

  const productPool = useMemo(() => products.slice(0, 30), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productPool.slice(0, 8);
    return productPool
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productPool, query]);

  const onUploadImage = (index: number, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setImages((prev) => {
        const next = [...prev];
        next[index] = reader.result;
        return next.slice(0, 9);
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const numericPrice = Number(price);

    if (!numericPrice || numericPrice <= 0) {
      alert('價格必須大於 0 元');
      return;
    }
    const listingId = await createListing({
      title: title.trim() || itemName.trim() || '未命名貼文',
      itemName: itemName.trim() || title.trim() || '未命名商品',
      price: `NT$ ${numericPrice}`,
      quantity,
      description: description.trim() || '無補充說明',
      brand,
      series,
      condition,
      tradeMode,
      shipping,
      allowSwap,
      allowBargain,
      image: images[0] ?? '',
      images,
    });
    navigate(`/listing/${listingId}`);
  };

  return (
    <div className="animate-in fade-in duration-500 min-h-screen pb-32 text-black">
      <TopBar
        showBack
        title="新增上架商品"
        rightElement={
          <button type="button" className="text-black" aria-label="通知">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        }
      />

      <main className="mx-auto mt-20 max-w-lg space-y-8 px-container-margin">
        <section className="space-y-3">
          <p className={SECTION_TITLE}>照片上傳（最多 9 張）</p>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }, (_, index) => {
              const image = images[index];
              const isMain = index === 0;
              return (
                <label
                  key={index}
                  className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black bg-white transition-colors hover:bg-neutral-50"
                >
                  {image ? (
                    <>
                      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-white/90 text-black"
                        aria-label="移除照片"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-black group-hover:scale-110 transition-transform">
                        add_a_photo
                      </span>
                      <span className="mt-2 text-[10px] font-bold text-black">{isMain ? '主圖' : `照片 ${index + 1}`}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadImage(index, e.target.files?.[0])}
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <p className={SECTION_TITLE}>從圖鑑帶入</p>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(FIELD, 'rounded-full py-4 pl-12 pr-6')}
              placeholder="搜尋官方圖鑑自動帶入資料…"
              type="search"
            />
          </div>
          {filtered.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setImages([p.image]);
                    setItemName(p.title);
                    if (!title) setTitle(p.title);
                  }}
                  className="aspect-square overflow-hidden rounded-xl border-2 border-black bg-white active:scale-95"
                >
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
          <p className={SECTION_TITLE}>商品資訊</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="add-listing-brand">
                品牌
              </label>
              <select
                id="add-listing-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={cn(FIELD, 'cursor-pointer appearance-none')}
              >
                <option>POPMART 泡泡瑪特</option>
                <option>52TOYS</option>
                <option>Finding Unicorn</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="add-listing-series">
                系列
              </label>
              <select
                id="add-listing-series"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className={cn(FIELD, 'cursor-pointer appearance-none')}
              >
                <option>LABUBU The Monsters</option>
                <option>Molly</option>
                <option>Skullpanda</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="add-listing-title">
              貼文標題
            </label>
            <input
              id="add-listing-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD}
              placeholder="例如：換坑出清 - Labubu 稀有款"
              type="text"
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="add-listing-item-name">
              子系列 / 款式名稱
            </label>
            <input
              id="add-listing-item-name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className={FIELD}
              placeholder="例如：精靈天團系列 - 坐姿坐下"
              type="text"
            />
          </div>
        </section>

        <section className="space-y-3">
          <p className={SECTION_TITLE}>商品狀態</p>
          <div className="flex gap-1 rounded-2xl border-2 border-black bg-white p-1">
            {['全新未拆', '已拆盒', '展示過'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={cn(
                  'flex-1 rounded-xl py-3 text-xs font-bold transition-colors',
                  condition === c ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className={SECTION_TITLE}>交易方式</p>
          <div className="flex flex-wrap gap-2">
            {['我要賣', '我想換', '加入拆盒團'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTradeMode(m)}
                className={cn(
                  'cursor-pointer rounded-full border-2 px-6 py-2 text-xs font-bold transition-all',
                  tradeMode === m
                    ? 'border-black bg-black text-white'
                    : 'border-black bg-white text-black hover:bg-neutral-50'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
          <p className={SECTION_TITLE}>價格與描述</p>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="add-listing-price">
              期望售價
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black">NT$</span>
              <input
                id="add-listing-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={cn(FIELD, 'pl-14 text-xl font-black')}
                placeholder="0"
                type="number"
                min={1}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="add-listing-quantity">
              上架數量
            </label>
            <input
              id="add-listing-quantity"
              value={quantity}
              min={1}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className={cn(FIELD, 'font-black')}
              type="number"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="add-listing-description">
              商品描述
            </label>
            <textarea
              id="add-listing-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(FIELD, 'resize-none leading-relaxed')}
              placeholder="詳細描述商品細節、瑕疵狀況或是理想交換物…"
              rows={4}
            />
          </div>
        </section>

        <section className="space-y-3">
          <p className={SECTION_TITLE}>交易選項</p>
          <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-black">swap_horiz</span>
              <span className="text-sm font-bold uppercase tracking-wider text-black">開放交換</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowSwap}
              onClick={() => setAllowSwap((v) => !v)}
              className={cn(
                'flex h-7 w-12 items-center rounded-full border-2 border-black px-0.5 transition-colors',
                allowSwap ? 'bg-black' : 'bg-neutral-200'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-white transition-transform',
                  allowSwap ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-black">payments</span>
              <span className="text-sm font-bold uppercase tracking-wider text-black">允許議價</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowBargain}
              onClick={() => setAllowBargain((v) => !v)}
              className={cn(
                'flex h-7 w-12 items-center rounded-full border-2 border-black px-0.5 transition-colors',
                allowBargain ? 'bg-black' : 'bg-neutral-200'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-white transition-transform',
                  allowBargain ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </section>

        <section className="space-y-1.5">
          <label className={LABEL} htmlFor="add-listing-shipping">
            出貨方式
          </label>
          <select
            id="add-listing-shipping"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            className={cn(FIELD, 'cursor-pointer appearance-none py-4')}
          >
            <option>7-11 店到店</option>
            <option>全家 店到店</option>
            <option>面交（特定區域）</option>
            <option>郵局包裹</option>
          </select>
        </section>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            className="rounded-full border-2 border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-neutral-50 active:scale-95"
          >
            儲存草稿
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            className="rounded-full border-2 border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-white active:scale-95"
          >
            發布 listing
          </motion.button>
        </div>
      </main>
    </div>
  );
}
