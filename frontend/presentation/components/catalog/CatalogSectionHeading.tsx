import React from 'react';

type Props = {
  label: string;
  title?: string;
  count?: number;
};

export default function CatalogSectionHeading({ label, title, count }: Props) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-secondary">{label}</p>
        {title ? (
          <h2 className="mt-0.5 truncate text-base font-extrabold text-on-background">{title}</h2>
        ) : null}
      </div>
      {count != null ? (
        <span className="shrink-0 rounded-full border border-outline bg-white px-2 py-0.5 text-[10px] font-bold shadow-[2px_2px_0_#111]">
          {count}
        </span>
      ) : null}
    </div>
  );
}
