import React from 'react';
import { motion } from 'motion/react';
import CollectionOverlayActions from '@/frontend/presentation/components/CollectionOverlayActions';

type Props = {
  title: string;
  image?: string;
  isWished?: boolean;
  isOwned?: boolean;
  onClick?: () => void;
  onToggleWish?: (e: React.MouseEvent) => void;
  onToggleOwned?: (e: React.MouseEvent) => void;
};

function stopAction(e: React.MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
}

export default function CatalogFigurineTile({
  title,
  image,
  isWished,
  isOwned,
  onClick,
  onToggleWish,
  onToggleOwned,
}: Props) {
  return (
    <motion.div whileTap={onClick ? { scale: 0.97 } : undefined} className="flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-outline bg-neutral-50 shadow-[3px_3px_0_#111]">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex h-full w-full items-center justify-center p-2 active:opacity-90"
          >
            {image ? (
              <img
                src={image}
                alt=""
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-on-surface-variant">inventory_2</span>
            )}
          </button>
        ) : image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-contain p-2"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
        )}
        <CollectionOverlayActions
          isWished={isWished}
          isOwned={isOwned}
          onToggleWish={
            onToggleWish
              ? (e) => {
                  stopAction(e);
                  onToggleWish(e);
                }
              : undefined
          }
          onToggleOwned={
            onToggleOwned
              ? (e) => {
                  stopAction(e);
                  onToggleOwned(e);
                }
              : undefined
          }
          size="sm"
        />
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-center text-[10px] font-bold leading-snug text-on-surface">
        {title}
      </p>
    </motion.div>
  );
}
