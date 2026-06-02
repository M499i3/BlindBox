import React, { useMemo } from 'react';
import { LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  images: string[];
  onUpload: (index: number, file?: File | null) => void;
  onRemove: (index: number) => void;
};

export default function ListingPhotoUpload({ images, onUpload, onRemove }: Props) {
  const visibleSlots = useMemo(
    () => Math.min(9, Math.max(1, images.length + 1)),
    [images.length]
  );

  return (
    <section className="space-y-3">
      <p className={LISTING_SECTION}>照片上傳（最多 9 張）</p>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: visibleSlots }, (_, index) => {
          const image = images[index];
          const isMain = index === 0;
          return (
            <label
              key={index}
              className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black bg-white transition-colors hover:bg-neutral-50"
            >
              {image ? (
                <>
                  <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-white/90 text-black"
                    aria-label="移除照片"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-black transition-transform group-hover:scale-110">
                    add_a_photo
                  </span>
                  <span className="mt-2 text-[10px] font-bold text-black">
                    {isMain ? '主圖' : `照片 ${index + 1}`}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUpload(index, e.target.files?.[0])}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
