import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type CartIconProps = {
  className?: string;
  size?: number;
};

export default function CartIcon({ className, size = 22 }: CartIconProps) {
  return (
    <img
      src="/shopping-cart-icon.svg?v=1"
      alt=""
      className={cn('block object-contain mix-blend-multiply', className)}
      width={size}
      height={size}
      decoding="async"
      aria-hidden
    />
  );
}
