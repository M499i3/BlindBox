import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { TOPBAR_LOGO_SIZE } from '@/frontend/presentation/constants/topbar';

type AppLogoProps = {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
};

export default function AppLogo({
  className,
  iconClassName,
  showWordmark = true,
}: AppLogoProps) {
  return (
    <div className={cn('flex h-full min-w-0 items-end overflow-visible', className)}>
      <img
        src="/blindy-icon.svg?v=3"
        alt=""
        className={cn(
          'block shrink-0 self-end object-contain object-bottom mix-blend-multiply',
          iconClassName
        )}
        style={
          iconClassName
            ? undefined
            : { height: TOPBAR_LOGO_SIZE, width: TOPBAR_LOGO_SIZE }
        }
        decoding="async"
      />
      {showWordmark && (
        <span
          className="ml-3 self-center overflow-visible font-bold tracking-tight text-on-background leading-[1.15]"
          style={{ fontSize: '1.5rem' }}
        >
          Blindy
        </span>
      )}
    </div>
  );
}
