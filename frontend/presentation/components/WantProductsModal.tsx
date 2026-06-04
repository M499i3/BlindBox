import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import {
  createDefaultWishAlertSettings,
  normalizeWishAlertSettings,
  type WishAlertSettings,
} from '@/frontend/domain/entities/wishAlert';
import CollectionActionButton from '@/frontend/presentation/components/CollectionActionButton';
import WishNotificationForm from '@/frontend/presentation/components/WishNotificationForm';
import type { ProductCollectionApi } from '@/frontend/presentation/hooks/useProductCollection';
import { APP_MAX_WIDTH } from '@/frontend/presentation/constants/layout';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { getLowestMarketPriceForTitle } from '@/frontend/shared/utils/marketPrice';
import { buildMarketplaceSearchUrl } from '@/frontend/shared/utils/shopNavigation';
type Props = {
  open: boolean;
  onClose: () => void;
  collection: ProductCollectionApi;
};

function getAppShellPortalRoot(): HTMLElement {
  return document.querySelector<HTMLElement>('.app-shell') ?? document.body;
}

export default function WantProductsModal({ open, onClose, collection }: Props) {
  const navigate = useNavigate();
  const { posts, getWishAlert, setWishAlert } = useAppState();
  const { wishedProducts, toggleWish, wishCount } = collection;

  const [settingsProduct, setSettingsProduct] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState<WishAlertSettings>(() => createDefaultWishAlertSettings(null));
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open) setPortalRoot(getAppShellPortalRoot());
  }, [open]);

  const lowestMarketPrice = useMemo(() => {
    if (!settingsProduct) return null;
    return getLowestMarketPriceForTitle(settingsProduct.title, posts);
  }, [settingsProduct, posts]);

  useEffect(() => {
    if (!open) {
      setSettingsProduct(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !settingsProduct) return;
    setForm(normalizeWishAlertSettings(getWishAlert(settingsProduct.id), lowestMarketPrice));
  }, [open, settingsProduct?.id, lowestMarketPrice, getWishAlert]);

  const goToSearch = (title: string) => {
    onClose();
    navigate(buildMarketplaceSearchUrl(title));
  };

  const handleSaveSettings = () => {
    if (!settingsProduct) return;
    setWishAlert(settingsProduct.id, form);
    setSettingsProduct(null);
  };

  if (!open || !portalRoot) return null;

  const modal = (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/50 px-3 pb-3 pt-8"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-full w-full max-w-full flex-col"
        style={{ maxWidth: APP_MAX_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/overlap.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-80 w-80 -translate-x-1/2 -translate-y-[100%] object-contain"
          decoding="async"
        />
        <div className="glass-card flex max-h-[min(calc(100dvh-6rem),560px)] w-full flex-col overflow-hidden rounded-3xl shadow-[4px_4px_0_#111]">
          <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-white/60 px-3 py-2 pt-20 backdrop-blur">
            <div className="min-w-0 flex-1">
              {settingsProduct ? (
                <button
                  type="button"
                  onClick={() => setSettingsProduct(null)}
                  className="mb-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-primary active:opacity-70"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  返回清單
                </button>
              ) : null}
              <h3 className="truncate text-xl font-extrabold text-on-surface">
                {settingsProduct ? '通知設定' : '想要'}
              </h3>
              <p className="mt-1 text-sm font-semibold text-on-surface-variant">{wishCount} 件盲盒</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white active:bg-black/[0.03]"
              aria-label="關閉"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 [-webkit-overflow-scrolling:touch]">
            {settingsProduct ? (
              <div className="space-y-3">
                <div className="flex gap-3 rounded-2xl border-2 border-outline bg-white p-2">
                  <img
                    src={settingsProduct.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover bg-neutral-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="card-title-2 text-xs font-bold leading-snug text-on-surface">
                      {settingsProduct.title}
                    </p>
                  </div>
                </div>
                <WishNotificationForm
                  value={form}
                  onChange={setForm}
                  lowestMarketHint={lowestMarketPrice}
                />
              </div>
            ) : wishedProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-on-surface-variant">還沒有想要的盲盒。</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wishedProducts.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => goToSearch(p.title)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToSearch(p.title);
                      }
                    }}
                    className="glass-card cursor-pointer overflow-hidden rounded-2xl text-left shadow-[4px_4px_0_#111] active:opacity-95"
                  >
                    <div className="relative aspect-square bg-neutral-100">
                      <img
                        src={p.image}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        <CollectionActionButton
                          kind="wish"
                          active
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWish(p.id);
                            if (settingsProduct?.id === p.id) setSettingsProduct(null);
                          }}
                          label="從想要移除"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="w-full text-left">
                        <p className="card-title-2 text-xs font-bold leading-snug text-on-surface">{p.title}</p>
                        <p className="mt-1 text-[10px] text-on-surface-variant">搜尋此盲盒</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsProduct(p);
                        }}
                        className="flex w-full items-center justify-center gap-1 rounded-full border-2 border-outline bg-white py-2 text-[11px] font-bold text-on-surface shadow-[2px_2px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        <span className="material-symbols-outlined text-base">notifications</span>
                        通知設定
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {settingsProduct ? (
            <div className="shrink-0 border-t border-black/[0.06] bg-white/80 p-4 backdrop-blur">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full rounded-full border-2 border-outline bg-primary py-3.5 text-sm font-extrabold text-on-primary shadow-[4px_4px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                儲存通知設定
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
