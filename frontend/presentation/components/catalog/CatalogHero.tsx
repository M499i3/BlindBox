import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type Stat = { label: string; value: number | string };

type Props = {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  coverImage?: string;
  stats?: Stat[];
  className?: string;
};

export default function CatalogHero({
  title,
  subtitle,
  breadcrumb,
  coverImage,
  stats = [],
  className,
}: Props) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border-2 border-outline bg-secondary-container/40 p-4 shadow-[4px_4px_0_#111]',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent-sky/30" />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-accent-coral/20" />

      <div className="relative flex gap-4">
        {coverImage ? (
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-outline bg-white shadow-[3px_3px_0_#111]">
            <img
              src={coverImage}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {breadcrumb && breadcrumb.length > 0 ? (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {breadcrumb.join(' · ')}
            </p>
          ) : null}
          <h1 className="text-xl font-extrabold leading-tight text-on-surface">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{subtitle}</p>
          ) : null}

          {stats.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-white px-2.5 py-1 text-[10px] font-bold shadow-[2px_2px_0_#111]"
                >
                  <span className="text-sm font-extrabold text-on-background">{s.value}</span>
                  <span className="text-on-surface-variant">{s.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
