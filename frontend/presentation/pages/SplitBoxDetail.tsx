import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { navigateBack, navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import TopBar from '@/frontend/presentation/components/TopBar';
import {
  completeSplitBox,
  getSplitBox,
  shipSplitBox,
} from '@/frontend/infrastructure/api/splitBoxApi';
import {
  SPLIT_BOX_STATUS_LABEL,
  type SplitBoxGroupDetail,
  type SplitBoxSlot,
} from '@/frontend/domain/entities/splitBox';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { computeSplitBoxProgress } from '@/frontend/shared/utils/splitBoxProgress';
import { cn } from '@/frontend/shared/utils/cn';

const SLOT_SORT_ORDER: Record<SplitBoxSlot['status'], number> = {
  available: 0,
  claimed: 1,
  reserved: 2,
};

const SlotCard: React.FC<{
  slot: SplitBoxSlot;
  disabled: boolean;
  groupOpen: boolean;
  isInConsideration: boolean;
  onAddToConsideration?: () => void;
  onClaim: () => void;
  onOpenListing?: (listingId: string) => void;
}> = ({
  slot,
  disabled,
  groupOpen,
  isInConsideration,
  onAddToConsideration,
  onClaim,
  onOpenListing,
}) => {
  const isClaimable = slot.status === 'available' && groupOpen;

  const statusLabel =
    slot.status === 'reserved'
      ? '團主自留'
      : slot.status === 'claimed'
        ? '已認領'
        : groupOpen
          ? '可認領'
          : '未認領';

  const canOpenListing = Boolean(slot.listingId && isClaimable);

  return (
    <div
      role={canOpenListing ? 'button' : undefined}
      tabIndex={canOpenListing ? 0 : undefined}
      onClick={() => {
        if (canOpenListing && slot.listingId) onOpenListing?.(slot.listingId);
      }}
      onKeyDown={(e) => {
        if (canOpenListing && slot.listingId && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpenListing?.(slot.listingId!);
        }
      }}
      className={cn(
        'overflow-hidden rounded-2xl border-2 bg-white shadow-[3px_3px_0_#111] text-left',
        isClaimable ? 'border-outline' : 'border-black/15',
        canOpenListing && 'cursor-pointer active:opacity-95'
      )}
    >
      <div className="relative aspect-square bg-neutral-50">
        {slot.productImage ? (
          <img src={slot.productImage} alt="" className="h-full w-full object-contain p-3" referrerPolicy="no-referrer" />
        ) : null}
        <span
          className={cn(
            'absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold',
            isClaimable ? 'bg-primary text-white' : 'bg-black/60 text-white'
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <p className="card-title-2 text-xs font-bold leading-snug">{slot.productTitle}</p>
        <p className="text-sm font-extrabold text-primary">{slot.price}</p>
        {slot.claimedByName ? (
          <p className="text-[10px] text-on-surface-variant">認領：{slot.claimedByName}</p>
        ) : null}
        {isClaimable && !disabled ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={!onAddToConsideration || isInConsideration}
              onClick={(e) => {
                e.stopPropagation();
                onAddToConsideration?.();
              }}
              className={cn(
                'w-full rounded-full border-2 border-outline py-2 text-xs font-extrabold shadow-[2px_2px_0_#111] disabled:opacity-70',
                isInConsideration
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-white text-on-background'
              )}
            >
              {isInConsideration ? '已加入購物車' : '考慮一下（加購物車）'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClaim();
              }}
              className="w-full rounded-full border-2 border-black bg-black py-2 text-xs font-extrabold text-white"
            >
              認領此款
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default function SplitBoxDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useAppState();
  const [group, setGroup] = useState<SplitBoxGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setGroup(await getSplitBox(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaim = (slotId: string) => {
    if (!id) return;
    const params = new URLSearchParams({ slotId });
    const slot = group?.slots.find((s) => s.id === slotId);
    if (slot?.listingId) params.set('listingId', slot.listingId);
    navigateWithReturn(navigate, `/split-box/${id}/apply?${params.toString()}`, location);
  };

  const handleAddToConsideration = (listingId: string) => {
    addToCart(listingId);
  };

  const handleShip = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      setGroup(await shipSplitBox(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      setGroup(await completeSplitBox(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const sortedSlots = useMemo(() => {
    if (!group) return [];
    return [...group.slots].sort(
      (a, b) => (SLOT_SORT_ORDER[a.status] ?? 9) - (SLOT_SORT_ORDER[b.status] ?? 9)
    );
  }, [group]);

  const myClaimedSlots = useMemo(() => {
    if (!group) return [];
    const ids = new Set(group.myClaimedSlotIds);
    return group.slots.filter((s) => ids.has(s.id));
  }, [group]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24 text-sm text-on-surface-variant">
        載入中…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-6 pt-24 text-center">
        <p className="text-sm text-on-surface-variant">{error || '找不到拆盒團'}</p>
        <button
          type="button"
          onClick={() => navigateBack(navigate, location)}
          className="mt-4 text-sm font-bold text-primary"
        >
          返回
        </button>
      </div>
    );
  }

  const { filled, total, percent } = computeSplitBoxProgress(group);
  const canClaim = group.status === 'open' && !group.isOrganizer;

  return (
    <div className="animate-in fade-in min-h-full pb-32 duration-500">
      <TopBar showBack title="拆盒團" rightElement={<></>} />

      <main className="space-y-6 px-container-margin pt-topbar-content">
        <section className="overflow-hidden rounded-2xl border-2 border-outline bg-white shadow-[4px_4px_0_#111]">
          <div className="flex gap-4 p-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {group.coverImage ? (
                <img src={group.coverImage} alt="" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                {SPLIT_BOX_STATUS_LABEL[group.status] ?? group.status}
              </p>
              <h1 className="mt-1 text-lg font-extrabold leading-snug">{group.title}</h1>
              <p className="mt-1 text-xs text-on-surface-variant">
                {[group.brand, group.series].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-xs font-semibold">團主：{group.organizerName}</p>
            </div>
          </div>

          <div className="border-t border-black/10 px-4 py-3">
            <div className="mb-1.5 flex justify-between text-[10px] font-bold">
              <span className="text-on-surface-variant">認領進度</span>
              <span>
                {filled} / {total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-accent-sky transition-all" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span>整盒 {group.totalPrice}</span>
              <span>每款 {group.pricePerSlot}</span>
              <span>{group.shipping}</span>
            </div>
            {group.description ? (
              <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{group.description}</p>
            ) : null}
          </div>
        </section>

        {!group.isOrganizer && myClaimedSlots.length > 0 ? (
          <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">你認領的款式</h2>
            <div className="mt-3 space-y-2">
              {myClaimedSlots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    {slot.productImage ? (
                      <img src={slot.productImage} alt="" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface">{slot.productTitle}</p>
                    <p className="text-xs font-semibold text-primary">{slot.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <p className="text-sm font-semibold text-secondary">{error}</p> : null}

        {group.isOrganizer && (group.status === 'full' || group.status === 'open') && group.claimedCount > 0 ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleShip}
            className="w-full rounded-full border-2 border-black bg-black py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            標記已出貨
          </button>
        ) : null}

        {group.isOrganizer && group.status === 'shipping' ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleComplete}
            className="w-full rounded-full border-2 border-outline bg-white py-3 text-sm font-extrabold shadow-[3px_3px_0_#111] disabled:opacity-50"
          >
            標記拆盒團完成
          </button>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-extrabold">款式認領</h2>
          <div className="grid grid-cols-2 gap-3">
            {sortedSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                disabled={!canClaim}
                groupOpen={group.status === 'open'}
                isInConsideration={Boolean(slot.listingId && isInCart(slot.listingId))}
                onAddToConsideration={
                  slot.listingId ? () => handleAddToConsideration(slot.listingId) : undefined
                }
                onClaim={() => handleClaim(slot.id)}
                onOpenListing={(listingId) =>
                  navigateWithReturn(navigate, `/listing/${listingId}`, location)
                }
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
