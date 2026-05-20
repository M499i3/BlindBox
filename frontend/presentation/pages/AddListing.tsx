import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function AddListing() {
  const navigate = useNavigate();
  const { createListing } = useAppState();
  const { products } = useCatalogProducts();
  const [image, setImage] = useState<string>('');
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
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

  const onUploadImage = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const listingId = await createListing({
      title: title.trim() || itemName.trim() || '未命名貼文',
      itemName: itemName.trim() || title.trim() || '未命名商品',
      price: price.trim() ? `NT$ ${price.trim()}` : 'NT$ 0',
      description: description.trim() || '無補充說明',
      brand,
      series,
      condition,
      tradeMode,
      shipping,
      allowSwap,
      allowBargain,
      image,
    });
    navigate(`/listing/${listingId}`);
  };

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-32">
      <TopBar showBack title="新增上架商品" 
        rightElement={
          <button className="text-slate-400"><span className="material-symbols-outlined">notifications</span></button>
        }
      />
      
      <main className="mt-20 px-container-margin max-w-lg mx-auto space-y-8">
        <section className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">照片上傳 (最多9張)</label>
          <div className="grid grid-cols-3 gap-3">
            <label className="aspect-square glass-card rounded-2xl overflow-hidden flex flex-col items-center justify-center border-dashed border-2 border-black/[0.12] hover:border-primary/50 transition-colors cursor-pointer group relative">
              {image ? (
                <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add_a_photo</span>
                  <span className="text-[10px] font-bold mt-2 text-slate-400">主圖</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUploadImage(e.target.files?.[0])}
              />
            </label>
            <div className="aspect-square bg-surface-container-low rounded-2xl border border-white/5"></div>
            <div className="aspect-square bg-surface-container-low rounded-2xl border border-white/5"></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-full py-4 pl-12 pr-6 text-sm focus:ring-2 focus:ring-primary/30 transition-all outline-none" 
              placeholder="搜尋官方圖鑑自動帶入資料..." 
              type="text"
            />
          </div>
          {filtered.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setImage(p.image);
                    setItemName(p.title);
                    if (!title) setTitle(p.title);
                  }}
                  className="aspect-square rounded-xl overflow-hidden border border-black/[0.08]"
                >
                  <img src={p.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">品牌</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all appearance-none text-sm"
              >
                <option>POPMART 泡泡瑪特</option>
                <option>52TOYS</option>
                <option>Finding Unicorn</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">系列</label>
              <select
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all appearance-none text-sm"
              >
                <option>LABUBU The Monsters</option>
                <option>Molly</option>
                <option>Skullpanda</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">貼文標題</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all text-sm" 
              placeholder="例如：換坑出清 - Labubu 稀有款" 
              type="text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">子系列 / 款式名稱</label>
            <input 
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all text-sm" 
              placeholder="例如：精靈天團系列 - 坐姿坐下" 
              type="text"
            />
          </div>
        </div>

        <section className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">商品狀態</label>
          <div className="flex p-1 bg-surface-container-low rounded-2xl">
            {['全新未拆', '已拆盒', '展示過'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-colors ${condition === c ? 'premium-gradient text-white shadow-lg' : 'text-slate-500 hover:text-black'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">交易方式</label>
          <div className="flex flex-wrap gap-2">
            {['我要賣', '我想換', '加入拆盒團'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTradeMode(m)}
                className={`px-6 py-2 rounded-full border text-xs font-bold cursor-pointer transition-all ${tradeMode === m ? 'border-primary bg-primary/10 text-primary' : 'border-black/[0.1] bg-white text-slate-500'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">期望售價</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">NT$</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-surface-container border-none rounded-xl py-3 pl-14 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-black text-xl"
                placeholder="0"
                type="number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">商品描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container border-none rounded-xl py-4 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none text-sm leading-relaxed"
              placeholder="詳細描述商品細節、瑕疵狀況或是理想交換物..."
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-5 glass-card rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">swap_horiz</span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-200">開放交換</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer ${allowSwap ? 'bg-primary' : 'bg-slate-400'}`}
              onClick={() => setAllowSwap((v) => !v)}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${allowSwap ? 'translate-x-6' : ''}`}></div>
            </div>
          </div>
          <div className="flex items-center justify-between p-5 glass-card rounded-2xl opacity-80">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">payments</span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-200">允許議價</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer ${allowBargain ? 'bg-primary' : 'bg-slate-400'}`}
              onClick={() => setAllowBargain((v) => !v)}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${allowBargain ? 'translate-x-6' : ''}`}></div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">出貨方式</label>
          <select
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl py-4 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all appearance-none text-sm"
          >
            <option>7-11 店到店</option>
            <option>全家 店到店</option>
            <option>面交 (特定區域)</option>
            <option>郵局包裹</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6">
          <button type="button" className="py-4 bg-surface-container-high text-on-surface font-black text-xs uppercase tracking-widest rounded-full border border-white/10 hover:bg-surface-bright transition-colors active:scale-95">儲存草稿</button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            className="py-4 premium-gradient text-white font-black text-xs uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(192,38,211,0.3)] active:scale-95"
          >
            發布 listing
          </motion.button>
        </div>
      </main>
    </div>
  );
}
