import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

export default function MyListings() {
  const navigate = useNavigate();
  const { listings } = useAppState();
  const items = listings;

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar
        title="我的上架"
        showBack
        rightElement={
          <button
            type="button"
            onClick={() => navigate('/add-listing')}
            className="text-sm font-bold text-primary"
          >
            新增
          </button>
        }
      />

      <main className="pt-topbar px-5 grid grid-cols-2 gap-3 max-w-md mx-auto">
        {items.length === 0 && (
          <p className="col-span-2 text-sm text-on-surface-variant text-center py-20">
            你還沒有上架貼文，先去新增一篇吧。
          </p>
        )}
        {items.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/listing/${p.id}`)}
            className="glass-card rounded-2xl overflow-hidden text-left"
          >
            <div className="aspect-square bg-neutral-100 relative">
              <img
                src={p.image}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2 right-2 text-[8px] font-bold bg-black/55 text-white px-2 py-0.5 rounded">
                上架中
              </span>
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">{p.title}</p>
              <p className="text-sm font-bold text-primary mt-1">{p.price}</p>
            </div>
          </motion.button>
        ))}
      </main>
    </div>
  );
}
