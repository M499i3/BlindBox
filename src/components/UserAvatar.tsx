import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<Size, { wrap: string; icon: string }> = {
  sm: { wrap: 'w-8 h-8', icon: 'size-[18px]' },
  md: { wrap: 'w-10 h-10', icon: 'size-5' },
  lg: { wrap: 'w-14 h-14', icon: 'size-7' },
  xl: { wrap: 'w-24 h-24', icon: 'size-12' },
};

export default function UserAvatar({
  className,
  size = 'md',
}: {
  className?: string;
  size?: Size;
}) {
  const { wrap, icon } = sizes[size];
  return (
    <div
      className={cn(
        wrap,
        'rounded-full bg-[#dbdbdb] flex items-center justify-center text-[#8e8e8e] border border-black/[0.08]',
        className
      )}
      aria-hidden
    >
      <User className={icon} strokeWidth={1.75} />
    </div>
  );
}
