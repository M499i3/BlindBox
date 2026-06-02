import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

/** 全 App 統一：想要＝#ff9393、收藏冊＝#96c8f5、未選＝灰 */
export const COLLECTION_COLORS = {
  wishActive: '#ff9393',
  wishInactive: '#9CA3AF',
  ownedActive: '#96c8f5',
  ownedInactive: '#9CA3AF',
} as const;

type Kind = 'wish' | 'owned';

type Props = {
  kind: Kind;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
  variant?: 'overlay' | 'plain';
  className?: string;
  label?: string;
};

export default function CollectionActionButton({
  kind,
  active,
  onClick,
  size = 'md',
  variant = 'overlay',
  className,
  label,
}: Props) {
  const icon = kind === 'wish' ? 'favorite' : 'check_circle';
  const iconClass = size === 'sm' ? 'text-[18px]' : 'text-[20px]';
  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const activeColor = kind === 'wish' ? COLLECTION_COLORS.wishActive : COLLECTION_COLORS.ownedActive;
  const inactiveColor =
    variant === 'overlay' ? '#E5E7EB' : COLLECTION_COLORS.wishInactive;
  const defaultLabel =
    kind === 'wish'
      ? active
        ? '從想要移除'
        : '加入想要'
      : active
        ? '從收藏冊移除'
        : '加入收藏冊';

  return (
    <button
      type="button"
      data-no-scroll-top="true"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        'flex items-center justify-center rounded-full border backdrop-blur-md transition-colors active:scale-90',
        btnSize,
        variant === 'overlay'
          ? active
            ? 'border-white/30 bg-black/55'
            : 'border-white/15 bg-black/45'
          : active
            ? 'border-black/10 bg-white'
            : 'border-black/10 bg-white',
        className
      )}
      aria-label={label ?? defaultLabel}
      aria-pressed={active}
    >
      <span
        className={cn('material-symbols-outlined leading-none', iconClass)}
        style={{
          color: active ? activeColor : inactiveColor,
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {icon}
      </span>
    </button>
  );
}
