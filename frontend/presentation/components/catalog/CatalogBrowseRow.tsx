import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/frontend/shared/utils/cn';
import CollectionOverlayActions from '@/frontend/presentation/components/CollectionOverlayActions';

type Props = {
  title: string;
  subtitle?: string;
  image?: string;
  count?: number;
  onClick: () => void;
  isAllWished?: boolean;
  isAllOwned?: boolean;
  onToggleWish?: (e: React.MouseEvent) => void;
  onToggleOwned?: (e: React.MouseEvent) => void;
  className?: string;
};

function stopAction(e: React.MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
}

export default function CatalogBrowseRow({
  title,
  subtitle,
  image,
  count,
  onClick,
  isAllWished,
  isAllOwned,
  onToggleWish,
  onToggleOwned,
  className,
}: Props) {
  const showActions = onToggleWish || onToggleOwned;

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border-2 border-outline bg-white p-3 shadow-[4px_4px_0_#111]',
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">
          {image ? (
            <img
              src={image}
              alt=""
              className="h-full w-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">category</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {subtitle ? (
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{subtitle}</p>
          ) : null}
          <p className="line-clamp-2 text-sm font-extrabold leading-snug text-on-surface">{title}</p>
          {count != null && count > 0 ? (
            <p className="mt-0.5 text-[11px] font-semibold text-on-surface-variant">{count} 款</p>
          ) : null}
        </div>

        <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
      </button>

      {showActions ? (
        <CollectionOverlayActions
          variant="inline"
          isWished={isAllWished}
          isOwned={isAllOwned}
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
          className="border-l border-black/10 pl-2"
        />
      ) : null}
    </motion.div>
  );
}
