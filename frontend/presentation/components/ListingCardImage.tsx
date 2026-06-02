import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { resolveListingImage } from '@/frontend/shared/utils/listingImage';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  fit?: 'cover' | 'contain';
};

export default function ListingCardImage({ src, alt = '', className, fit = 'cover' }: Props) {
  const hasImage = Boolean(src?.trim());
  const resolved = resolveListingImage(src);
  const useContain = fit === 'contain' || !hasImage;

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      className={cn(
        'h-full w-full',
        useContain ? 'bg-neutral-50 object-contain p-4' : 'object-cover',
        className
      )}
    />
  );
}
