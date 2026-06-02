import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import {
  claimSplitBoxSlot,
  completeSplitBox,
  getSplitBox,
  shipSplitBox,
} from '@/frontend/infrastructure/api/splitBoxApi';
import {
  SPLIT_BOX_STATUS_LABEL,
  type SplitBoxGroupDetail,
  type SplitBoxSlot,
} from '@/frontend/domain/entities/splitBox';
import { cn } from '@/frontend/shared/utils/cn';

function SlotCard({
  slot,
  disabled,
  onClaim,
  claiming,
  onViewListing,
}: {
  slot: SplitBoxSlot;
  disabled: boolean;
  onClaim: () => void;
  claiming: boolean;
  onViewListing?: (listingId: string) => void;
}) {
  const statusLabel =
    slot.status === 'reserved'
      ? '團主自留'
      : slot.status === 'claimed'
        ? '已認領'
        : '可認領';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border-2 bg-white shadow-[3px_3px_0_#111]',
        slot.status === 'available' ? 'border-outline' : 'border-black/15'
      )}
    >
      <div className="relative aspect-square bg-neutral-50">
        {slot.productImage ? (
          <img src={slot.productImage} alt="" className="h-full w-full object-contain p-3" referrerPolicy="no-referrer" />
        ) : null}
        <span
          className={cn(
            'absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold',
            slot.status === 'available' ? 'bg-primary text-white' : 'bg-black/60 text-white'
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-xs font-bold leading-snug">{slot.productTitle}</p>
        <p className="text-sm font-extrabold text-primary">{slot.price}</p>
        {slot.claimedByName ? (
          <p className="text-[10px] text-on-surface-variant">認領：{slot.claimedByName}</p>
        ) : null}
        {slot.status === 'available' && !disabled ? (
          <button
            type="button"
            disabled={claiming}
            onClick={onClaim}
            className="w-full rounded-full border-2 border-black bg-black py-2 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {claiming ? '認領中…' : '認領此款'}
          </button>
        ) : null}
        {slot.listingId && slot.status !== 'reserved' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewListing?.(slot.listingId!);
            }}
            className="w-full text-[10px] font-bold text-primary underline"
          >
            查看貼文
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SplitBoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<SplitBoxGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
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

  const handleClaim = async (slotId: string) => {
    if (!id) return;
    setClaimingId(slotId);
    setError('');
    try {
      setGroup(await claimSplitBoxSlot(id, slotId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '認領失敗');
    } finally {
      setClaimingId(null);
    }
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
        <button type="button" onClick={() => navigate('/profile')} className="mt-4 text-sm font-bold text-primary">
          返回
        </button>
      </div>
    );
  }

  const claimableTotal = group.targetCount - group.reservedCount;
  const progress = claimableTotal ? Math.round((group.claimedCount / claimableTotal) * 100) : 0;
  const canClaim = group.status === 'open' && !group.isOrganizer;

  return (
    <div className="animate-in fade-in min-h-full pb-32 duration-500">
      <TopBar showBack title="拆盒團" onBack={() => navigate('/profile')} rightElement={<></>} />

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
                {group.claimedCount} / {claimableTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-accent-sky transition-all" style={{ width: `${progress}%` }} />
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
            {group.slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                disabled={!canClaim}
                claiming={claimingId === slot.id}
                onClaim={() => handleClaim(slot.id)}
                onViewListing={(listingId) => navigate(`/listing/${listingId}`)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
