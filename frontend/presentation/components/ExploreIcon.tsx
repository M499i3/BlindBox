import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type ExploreIconProps = {
  className?: string;
  size?: number;
};

export default function ExploreIcon({ className, size = 22 }: ExploreIconProps) {
  return (
    <img
      src="/compass-icon.svg?v=1"
      alt=""
      className={cn('block border-0 object-contain mix-blend-multiply', className)}
      width={size}
      height={size}
      decoding="async"
      aria-hidden
    />
  );
}
