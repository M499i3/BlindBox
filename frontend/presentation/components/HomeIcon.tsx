import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type HomeIconProps = {
  className?: string;
  size?: number;
};

export default function HomeIcon({ className, size = 22 }: HomeIconProps) {
  return (
    <img
      src="/home-icon.svg?v=1"
      alt=""
      className={cn('block border-0 object-contain mix-blend-multiply', className)}
      width={size}
      height={size}
      decoding="async"
      aria-hidden
    />
  );
}
