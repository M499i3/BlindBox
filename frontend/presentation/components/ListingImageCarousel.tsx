import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import {
  hasListingImage,
  resolveListingImages,
} from '@/frontend/shared/utils/listingImage';

type Props = {
  images?: string[] | null;
  fallbackImage?: string | null;
  title: string;
  imageFit?: 'cover' | 'contain';
};

export default function ListingImageCarousel({
  images,
  fallbackImage,
  title,
  imageFit = 'cover',
}: Props) {
  const resolvedImages = useMemo(
    () => resolveListingImages(images, fallbackImage),
    [images, fallbackImage]
  );
  const isPlaceholder = !hasListingImage(images, fallbackImage);
  const [index, setIndex] = useState(0);
  const total = resolvedImages.length;
  const current = resolvedImages[index] ?? resolvedImages[0];

  useEffect(() => {
    setIndex(0);
  }, [resolvedImages]);

  const useContain = imageFit === 'contain' || isPlaceholder;
  const imageClass = cn(
    'h-full w-full',
    useContain ? 'bg-neutral-50 object-contain p-4' : 'object-cover'
  );

  if (total <= 1) {
    return (
      <img
        src={current}
        alt={title}
        referrerPolicy="no-referrer"
        className={imageClass}
      />
    );
  }

  return (
    <>
      <img src={current} alt={title} referrerPolicy="no-referrer" className={imageClass} />
      <button
        type="button"
        data-no-scroll-top="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIndex((prev) => (prev - 1 + total) % total);
        }}
        className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
        aria-label="上一張照片"
      >
        <span className="material-symbols-outlined text-base">chevron_left</span>
      </button>
      <button
        type="button"
        data-no-scroll-top="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIndex((prev) => (prev + 1) % total);
        }}
        className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
        aria-label="下一張照片"
      >
        <span className="material-symbols-outlined text-base">chevron_right</span>
      </button>
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 px-2 py-1">
        {resolvedImages.map((_, dotIdx) => (
          <span
            key={`${title}-dot-${dotIdx}`}
            className={cn('h-1.5 w-1.5 rounded-full', dotIdx === index ? 'bg-white' : 'bg-white/45')}
          />
        ))}
      </div>
    </>
  );
}
