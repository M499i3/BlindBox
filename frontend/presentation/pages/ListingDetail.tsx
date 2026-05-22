import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

export default function ListingDetail() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { getPostById, addToCart, removeFromCart, isInCart, avatarDataUrl } = useAppState();
  const listing = getPostById(id);

  if (!listing) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <p className="text-sm text-on-surface-variant mb-4">找不到這篇貼文，可能已被刪除。</p>
        <button type="button" onClick={() => navigate('/')} className="premium-gradient text-white px-6 py-3 rounded-full text-sm font-bold">
          回市集
        </button>
      </div>
    );
  }

  const inCart = isInCart(listing.id);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="貼文詳情" />
      <main className="pt-20 px-5 max-w-md mx-auto space-y-6">
        <section className="glass-card rounded-2xl overflow-hidden">
          <div className="aspect-square bg-neutral-100">
            <img src={listing.image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="p-5 space-y-3">
            <h1 className="text-xl font-bold text-on-surface leading-snug">{listing.title}</h1>
            <p className="text-sm text-on-surface-variant">{listing.itemName}</p>
            <p className="text-2xl font-black text-primary">{listing.price}</p>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">貼文資訊</h2>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">品牌：</span>{listing.brand}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">系列：</span>{listing.series}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">狀態：</span>{listing.condition}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">交易方式：</span>{listing.tradeMode}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">出貨方式：</span>{listing.shipping}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">開放交換：</span>{listing.allowSwap ? '是' : '否'}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">允許議價：</span>{listing.allowBargain ? '是' : '否'}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">商品描述：</span>{listing.description}</p>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">賣家資訊</h2>
          <div className="flex items-center gap-3">
            {avatarDataUrl && !listing.isSeeded ? (
              <img src={avatarDataUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-black/[0.1]" />
            ) : (
              <UserAvatar size="md" />
            )}
            <div>
              <p className="text-sm font-bold text-on-surface">{listing.sellerName}</p>
              <p className="text-xs text-on-surface-variant">貼文建立於 {new Date(listing.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => (inCart ? removeFromCart(listing.id) : addToCart(listing.id))}
          className={`w-full py-4 rounded-full text-sm font-bold ${inCart ? 'bg-white border border-black/[0.12] text-on-surface' : 'premium-gradient text-white'}`}
        >
          {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
        </button>
      </main>
    </div>
  );
}
