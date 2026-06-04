import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserProfile } from '@/frontend/domain/entities/profile';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { APP_MAX_WIDTH } from '@/frontend/presentation/constants/layout';

type Props = {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  loading: boolean;
  fallbackName: string;
  listingCreatedAt?: string;
  activeListingCount?: number;
  onActiveListingsClick?: () => void;
  showContact?: boolean;
  onContact?: () => void;
  contactDisabled?: boolean;
  contacting?: boolean;
  contactLabel?: string;
};

function getAppShellPortalRoot(): HTMLElement {
  return document.querySelector<HTMLElement>('.app-shell') ?? document.body;
}

export default function SellerInfoModal({
  open,
  onClose,
  profile,
  loading,
  fallbackName,
  listingCreatedAt,
  activeListingCount,
  onActiveListingsClick,
  showContact = false,
  onContact,
  contactDisabled = false,
  contacting = false,
  contactLabel = '聯絡賣家',
}: Props) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open) setPortalRoot(getAppShellPortalRoot());
  }, [open]);

  if (!open || !portalRoot) return null;

  const displayName = profile?.displayName || fallbackName || '賣家';
  const displayId = profile?.displayId;
  const ratingAvg = profile?.ratingAvg ?? 0;
  const ratingCount = profile?.ratingCount ?? 0;
  const transactionCount = profile?.transactionCount ?? 0;
  const bio = profile?.bio?.trim();

  const modal = (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/50 px-3 pb-3 pt-8"
      role="dialog"
      aria-modal="true"
      aria-label="賣家資訊"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-full w-full max-w-full flex-col"
        style={{ maxWidth: APP_MAX_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-card flex max-h-[min(85vh,640px)] flex-col overflow-hidden rounded-3xl shadow-[4px_4px_0_#111]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <h3 className="truncate text-xl font-extrabold text-on-surface">賣家資訊</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white active:bg-black/[0.03]"
              aria-label="關閉"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 pb-6 [-webkit-overflow-scrolling:touch]">
            {loading ? (
              <p className="py-16 text-center text-sm text-on-surface-variant">載入中…</p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 rounded-full bg-gradient-to-tr from-primary to-tertiary-fixed p-1">
                    {profile?.avatarDataUrl ? (
                      <img
                        src={profile.avatarDataUrl}
                        alt=""
                        className="h-24 w-24 rounded-full border-4 border-white object-cover"
                      />
                    ) : (
                      <UserAvatar size="xl" className="border-4 border-white !bg-[#ededed]" />
                    )}
                  </div>
                  <h4 className="text-2xl font-bold text-on-surface">{displayName}</h4>
                  {displayId ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-on-primary-container opacity-60">
                      ID: {displayId}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1">
                    <span
                      className="material-symbols-outlined text-base text-amber-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="text-sm font-bold text-on-surface">{ratingAvg.toFixed(1)}</span>
                    <span className="text-xs text-on-surface-variant">
                      | {ratingCount} 則評價 · {transactionCount} 筆成交
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {onActiveListingsClick && (activeListingCount ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={onActiveListingsClick}
                      className="rounded-2xl border-2 border-outline bg-white p-4 text-center shadow-none transition-colors active:bg-black/[0.03]"
                    >
                      <p className="text-2xl font-bold text-primary">
                        {String(activeListingCount ?? 0).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                        上架中
                      </p>
                    </button>
                  ) : (
                    <div className="rounded-2xl border-2 border-outline bg-white p-4 text-center shadow-none">
                      <p className="text-2xl font-bold text-primary">
                        {String(activeListingCount ?? 0).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                        上架中
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl border-2 border-outline bg-white p-4 text-center shadow-none">
                    <p className="text-2xl font-bold text-primary">
                      {String(transactionCount).padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                      已完成
                    </p>
                  </div>
                </div>

                {listingCreatedAt ? (
                  <div className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      此貼文建立於
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {new Date(listingCreatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}

                {bio ? (
                  <div className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">自我介紹</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{bio}</p>
                  </div>
                ) : null}

                {showContact && onContact ? (
                  <button
                    type="button"
                    disabled={contactDisabled || contacting}
                    onClick={onContact}
                    className="w-full rounded-full border-2 border-outline bg-white py-4 text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                  >
                    {contacting ? '開啟中…' : contactLabel}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
