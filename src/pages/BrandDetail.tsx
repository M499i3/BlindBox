import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/src/components/TopBar';
import {
  deriveBrandLabel,
  productsByBrandSlug,
} from '@/src/lib/popmartShowcase';

function titleCase(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BrandDetail() {
  const { id: slug = '' } = useParams();
  const navigate = useNavigate();

  const matched = useMemo(() => productsByBrandSlug(slug), [slug]);
  const displayName = titleCase(slug);
  const hero =
    matched[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const series = useMemo(
    () =>
      matched.slice(0, 8).map((p, idx) => ({
        id: p.id,
        title: p.title,
        progress: `${Math.min(12, idx + 3)}/12`,
        percent: Math.min(100, 20 + idx * 12),
        image: p.image,
      })),
    [matched]
  );

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-background pb-32">
      <TopBar
        showBack
        title={displayName}
        rightElement={
          <div className="flex gap-4">
            <button
              type="button"
              className="text-primary"
              onClick={() => navigate('/explore')}
              aria-label="已加入收藏冊"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="text-black"
              aria-label="搜尋"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>
        }
      />

      <main className="pt-20 px-5 space-y-10 max-w-screen-md mx-auto">
        <section>
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6">
            <img
              className="w-full h-full object-cover"
              src={hero}
              referrerPolicy="no-referrer"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-on-surface">{displayName}</h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              以下為與「{displayName}」相關的官網商品（原型資料）。點卡片可進入商品頁，或到市集搜尋同款。
            </p>

            <div className="flex gap-10 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{series.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  系列項目
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{matched.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  相關商品
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold text-on-surface">系列 / 商品</h3>
            <button
              type="button"
              onClick={() =>
                navigate(`/search?q=${encodeURIComponent(deriveBrandLabel(matched[0]?.title ?? displayName))}`)
              }
              className="text-xs font-bold text-primary"
            >
              在市集搜尋
            </button>
          </div>
          <div className="grid grid-cols-2 gap-grid-gutter">
            {series.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="group relative flex flex-col gap-4 cursor-pointer"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    src={item.image}
                    referrerPolicy="no-referrer"
                    alt=""
                  />
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className="material-symbols-outlined text-primary drop-shadow-md"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface mb-1 line-clamp-2 text-sm leading-snug">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-black/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-tertiary-fixed"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap">
                      {item.progress}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
