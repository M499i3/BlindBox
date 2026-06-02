import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import CollectionActionButton from '@/frontend/presentation/components/CollectionActionButton';

type Props = {
  isWished?: boolean;
  isOwned?: boolean;
  onToggleWish?: (e: React.MouseEvent) => void;
  onToggleOwned?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
  variant?: 'overlay' | 'inline';
  className?: string;
};

export default function CollectionOverlayActions({
  isWished = false,
  isOwned = false,
  onToggleWish,
  onToggleOwned,
  size = 'md',
  variant = 'overlay',
  className,
}: Props) {
  if (!onToggleWish && !onToggleOwned) return null;

  const buttonVariant = variant === 'inline' ? 'plain' : 'overlay';

  const buttons = (
    <>
      {onToggleWish ? (
        <CollectionActionButton
          kind="wish"
          active={isWished}
          onClick={onToggleWish}
          size={size}
          variant={buttonVariant}
        />
      ) : null}
      {onToggleOwned ? (
        <CollectionActionButton
          kind="owned"
          active={isOwned}
          onClick={onToggleOwned}
          size={size}
          variant={buttonVariant}
        />
      ) : null}
    </>
  );

  if (variant === 'inline') {
    return <div className={cn('flex shrink-0 flex-col gap-1.5', className)}>{buttons}</div>;
  }

  return (
    <div
      className={cn('absolute top-2 right-2 z-10 flex flex-col gap-2', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {buttons}
    </div>
  );
}
