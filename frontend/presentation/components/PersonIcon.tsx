import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type PersonIconProps = {
  className?: string;
  size?: number;
};

export default function PersonIcon({ className, size = 22 }: PersonIconProps) {
  return (
    <img
      src="/person-icon.svg?v=1"
      alt=""
      className={cn('block border-0 object-contain mix-blend-multiply', className)}
      width={size}
      height={size}
      decoding="async"
      aria-hidden
    />
  );
}
