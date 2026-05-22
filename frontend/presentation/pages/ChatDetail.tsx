import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const idx = id ? parseInt(id, 10) || 0 : 0;
  const { products } = useCatalogProducts();
  const product = useMemo(
    () => products[idx % Math.max(1, products.length)],
    [idx, products]
  );
  const names = ['Alex Chen', '潮流收藏家_Ken', 'Mina_Lab'];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
      <TopBar
        showBack
        title={names[idx % names.length]}
        rightElement={
          <button type="button" onClick={() => navigate('/search')} className="text-black" aria-label="搜尋">
            <span className="material-symbols-outlined">search</span>
          </button>
        }
      />

      <section className="shrink-0 px-container-margin pt-topbar pb-stack-md">
          <div className="glass-card rounded-xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-black/[0.08]">
                {product && (
                  <img className="w-full h-full object-cover" src={product.image} referrerPolicy="no-referrer" alt="" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden text-sm min-w-0">
                <span className="font-bold text-on-surface truncate">{product?.title ?? '商品'}</span>
                <span className="font-bold text-primary">{product?.price ?? ''}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => product && navigate(`/product/${product.id}`)}
              className="premium-gradient text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-lg shadow-primary/25 active:scale-95 transition-transform whitespace-nowrap ml-2"
            >
              查看商品
            </button>
          </div>
      </section>

      <main className="app-scroll min-h-0 flex-1 overflow-y-auto no-scrollbar px-container-margin pb-4 flex flex-col gap-6">
          <div className="text-center">
            <span className="text-[10px] text-on-surface-variant bg-white/80 px-3 py-1 rounded-full uppercase tracking-widest font-bold border border-black/[0.06]">
              Monday 14:20
            </span>
          </div>

          <div className="flex items-end gap-2 max-w-[85%] self-start">
            <UserAvatar size="sm" className="flex-shrink-0 border border-black/[0.08]" />
            <div className="flex flex-col gap-1">
              <div className="bg-white border border-black/[0.08] p-3 rounded-2xl rounded-bl-sm text-on-surface text-sm shadow-sm">
                你好！請問這款還有保卡跟原始包裝嗎？
              </div>
              <span className="text-[10px] text-on-surface-variant ml-1">14:21</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-end max-w-[85%] self-end">
            <div className="premium-gradient p-3 rounded-2xl rounded-br-sm text-white text-sm shadow-lg shadow-black/15">
              有的，配件完整，盒子也還在。
            </div>
            <span className="text-[10px] text-on-surface-variant mr-1 text-right flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">done_all</span>
              14:22
            </span>
          </div>

          <div className="flex flex-col gap-1 items-end max-w-[85%] self-end">
            <div className="bg-white border border-black/[0.08] p-1 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-neutral-50 p-3 rounded-xl border border-black/[0.06] flex flex-col gap-3">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <span className="material-symbols-outlined text-sm">swap_horiz</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">發起交換申請</span>
                </div>
                <div className="flex gap-3">
                  {product && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                      <img className="w-full h-full object-cover" src={product.image} alt="" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center text-sm min-w-0">
                    <span className="font-bold text-on-surface line-clamp-2">{product?.title}</span>
                    <span className="text-xs text-on-surface-variant">全新未拆袋 / 附卡（示意）</span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 text-on-surface text-sm">我用這款交換，再貼 $300 給你可以嗎？</div>
            </div>
            <span className="text-[10px] text-on-surface-variant mr-1 text-right flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">done_all</span>
              14:25
            </span>
          </div>

          <div className="flex items-end gap-2 max-w-[85%] self-start">
            <UserAvatar size="sm" className="flex-shrink-0 border border-black/[0.08]" />
            <div className="flex flex-col gap-1">
              <div className="bg-white border border-black/[0.08] p-3 rounded-2xl rounded-bl-sm text-on-surface text-sm shadow-sm">
                可以！這款剛好我也在找。
              </div>
              <span className="text-[10px] text-on-surface-variant ml-1">14:26</span>
            </div>
          </div>
      </main>

      <footer className="shrink-0 z-50 w-full min-w-0 border-t border-black/[0.08] bg-white/95 px-4 pb-8 pt-4 backdrop-blur-md">
        <div className="mx-auto flex w-full min-w-0 max-w-full items-center gap-3 text-sm">
          <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-black/[0.08] text-on-surface-variant active:scale-90 transition-transform">
            <span className="material-symbols-outlined">add</span>
          </button>
          <div className="flex-1 relative group">
            <input
              className="w-full bg-white border border-black/[0.08] rounded-2xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary/40 transition-all"
              placeholder="輸入訊息..."
              type="text"
            />
          </div>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full premium-gradient text-white shadow-lg active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
