import React from 'react';
import { motion } from 'motion/react';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import ListingImageCarousel from '@/frontend/presentation/components/ListingImageCarousel';
import CollectionOverlayActions from '@/frontend/presentation/components/CollectionOverlayActions';
import { cn } from '@/frontend/shared/utils/cn';

/**
 * 卡片內容區固定高度（px）：
 * p-3(24) + badge h-6+mb-2(32) + title 2lh + gap h-2(8) + price h-6(24) + btn mt-2+h-11(52)
 */
const BODY_HEIGHT = 'min-h-[11.25rem]';

type Props = {
  title: string;
  price?: string;
  image?: string;
  images?: string[] | null;
  fallbackImage?: string | null;
  badge?: string | null;
  badgeClassName?: string;
  onClick: () => void;
  isWished?: boolean;
  isOwned?: boolean;
  onToggleWish?: (e: React.MouseEvent) => void;
  onToggleOwned?: (e: React.MouseEvent) => void;
  showCart?: boolean;
  isInCart?: boolean;
  cartDisabled?: boolean;
  onAddToCart?: (e: React.MouseEvent) => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: (e: React.MouseEvent) => void;
  className?: string;
  /** 橫向捲動列中的固定寬度卡片 */
  scrollItem?: boolean;
};

export default function ListingProductCard({
  title,
  price,
  image,
  images,
  fallbackImage,
  badge,
  badgeClassName,
  onClick,
  isWished,
  isOwned,
  onToggleWish,
  onToggleOwned,
  showCart = false,
  isInCart = false,
  cartDisabled = false,
  onAddToCart,
  actionLabel,
  actionDisabled = false,
  onAction,
  className,
  scrollItem = false,
}: Props) {
  const hasCarousel = Boolean(images?.length || fallbackImage);
  const hasAction = Boolean(actionLabel && onAction);
  const hasCart = Boolean(showCart && onAddToCart);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'glass-card flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl',
        scrollItem && 'basis-[48%] min-w-[48%] max-w-[48%]',
        className
      )}
    >
      {/* 1. 固定比例圖片區 */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-neutral-50">
        {hasCarousel ? (
          <ListingImageCarousel
            images={images}
            fallbackImage={fallbackImage ?? image}
            title={title}
            imageFit="contain"
          />
        ) : (
          <ListingCardImage src={image} alt={title} fit="contain" />
        )}
        <CollectionOverlayActions
          isWished={isWished}
          isOwned={isOwned}
          onToggleWish={onToggleWish}
          onToggleOwned={onToggleOwned}
        />
      </div>

      {/* 2–6. 固定高度文字／操作區 */}
      <div className={cn('flex shrink-0 flex-col overflow-hidden p-3', BODY_HEIGHT)}>
        {/* 2. 標籤區：固定 h-6，無 badge 也保留空間 */}
        <div className="mb-2 flex h-6 shrink-0 items-center">
          {badge ? (
            <span
              className={cn(
                'inline-flex max-w-full items-center rounded border px-2 py-0.5 text-[10px] leading-none',
                badgeClassName ?? 'border-primary-fixed-dim text-primary-fixed-dim'
              )}
            >
              <span className="truncate">{badge}</span>
            </span>
          ) : null}
        </div>

        {/* 3. 商品名稱：固定兩行高度，一行時保留第二行空白 */}
        <div className="shrink-0 overflow-hidden">
          <h3 className="card-title-2 text-sm font-semibold leading-5 text-on-surface">{title}</h3>
        </div>

        {/* 固定間距，取代 flex-1 避免高度飄移 */}
        <div className="h-2 shrink-0" aria-hidden />

        {/* 4. 價格區 */}
        <p className="flex h-6 shrink-0 items-center truncate text-sm font-bold text-primary">
          {price || '—'}
        </p>

        {/* 5. 按鈕區：無購物車時以 placeholder 維持高度 */}
        <div
          className={cn(
            'mt-2 shrink-0',
            hasAction && hasCart ? 'flex flex-col gap-2' : 'flex h-11 items-center gap-2'
          )}
        >
          {hasAction && hasCart ? (
            <>
              <button
                type="button"
                data-no-scroll-top="true"
                onClick={onAddToCart}
                disabled={cartDisabled}
                className={cn(
                  'flex h-9 w-full items-center justify-center gap-1.5 rounded-full border-2 border-outline px-2 text-xs font-extrabold text-on-background shadow-[3px_3px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-80',
                  isInCart ? 'bg-secondary text-on-secondary' : 'bg-white hover:bg-secondary/10'
                )}
                aria-label={isInCart ? '已加入購物車' : '加入購物車'}
              >
                <span className="truncate">{isInCart ? '已加入購物車' : '加入購物車'}</span>
              </button>
              <button
                type="button"
                data-no-scroll-top="true"
                onClick={onAction}
                disabled={actionDisabled}
                className="h-9 w-full rounded-full border-2 border-outline bg-white px-2 text-xs font-extrabold text-on-background shadow-[3px_3px_0_#111] transition-transform hover:bg-secondary/10 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
              >
                {actionLabel}
              </button>
            </>
          ) : hasAction ? (
            <button
              type="button"
              data-no-scroll-top="true"
              onClick={onAction}
              disabled={actionDisabled}
              className="h-11 w-full rounded-full border-2 border-outline bg-white px-3 text-xs font-extrabold text-on-background shadow-[3px_3px_0_#111] transition-transform hover:bg-secondary/10 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
            >
              {actionLabel}
            </button>
          ) : hasCart ? (
            <button
              type="button"
              data-no-scroll-top="true"
              onClick={onAddToCart}
              disabled={cartDisabled}
              className={cn(
                'h-11 w-full rounded-full border-2 border-outline px-3 text-xs font-extrabold shadow-[3px_3px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                isInCart
                  ? 'bg-secondary text-on-secondary opacity-90'
                  : cartDisabled
                    ? 'bg-black/[0.06] text-on-surface-variant opacity-80'
                    : 'bg-white text-on-background hover:bg-secondary/10'
              )}
              aria-label={isInCart ? '已加入購物車' : '加入購物車'}
            >
              {isInCart ? '已加入' : '加入購物車'}
            </button>
          ) : (
            <div className="h-11 w-full" aria-hidden />
          )}
        </div>
      </div>
    </motion.div>
  );
}
