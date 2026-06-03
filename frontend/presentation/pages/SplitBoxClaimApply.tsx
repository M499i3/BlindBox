import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import {
  claimSplitBoxSlot,
  getSplitBox,
} from '@/frontend/infrastructure/api/splitBoxApi';
import {
  SPLIT_BOX_STATUS_LABEL,
  type SplitBoxGroupDetail,
  type SplitBoxSlot,
} from '@/frontend/domain/entities/splitBox';
import { cn } from '@/frontend/shared/utils/cn';

const PROCESS_STEPS = [
  { title: '送出認領申請', desc: '選定款式並了解拆盒團規則後送出申請，尚未代表已確定取得商品。' },
  { title: '等待團員湊齊', desc: '需等所有開放款式被認領；若無法湊齊人數，團可能流團。' },
  { title: '團主出貨拆盒', desc: '滿團後團主購買整盒並出貨，依認領款式分配。' },
  { title: '確認收貨', desc: '收到商品後於平台標記完成。' },
] as const;

function resolveSlot(
  group: SplitBoxGroupDetail,
  slotId: string | null,
  listingId: string | null
): SplitBoxSlot | undefined {
  if (slotId) {
    return group.slots.find((s) => s.id === slotId);
  }
  if (listingId) {
    return group.slots.find((s) => s.listingId === listingId);
  }
  return undefined;
}

export default function SplitBoxClaimApply() {
  const { groupId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const slotIdParam = searchParams.get('slotId');
  const listingIdParam = searchParams.get('listingId');
  const navigate = useNavigate();

  const [group, setGroup] = useState<SplitBoxGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    try {
      setGroup(await getSplitBox(groupId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const slot = useMemo(
    () => (group ? resolveSlot(group, slotIdParam, listingIdParam) : undefined),
    [group, slotIdParam, listingIdParam]
  );

  const claimableTotal = group ? group.targetCount - group.reservedCount : 0;
  const progress = claimableTotal
    ? Math.round((group!.claimedCount / claimableTotal) * 100)
    : 0;

  const slotUnavailable =
    !slot || slot.status === 'reserved' || slot.status === 'claimed';
  const alreadyMine = Boolean(slot && group?.myClaimedSlotIds.includes(slot.id));

  const handleSubmitApplication = async () => {
    if (!groupId || !slot || slot.status !== 'available') return;
    setSubmitting(true);
    setError('');
    try {
      await claimSplitBoxSlot(groupId, slot.id);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '申請失敗，請稍後再試');
    } finally {
      setSubmitting(false);
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
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm font-bold text-primary">
          返回
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="animate-in fade-in min-h-full pb-32 duration-500">
        <TopBar showBack title="認領申請" />
        <main className="space-y-6 px-container-margin pt-topbar-content">
          <section className="rounded-2xl border-2 border-outline bg-white p-6 text-center shadow-[4px_4px_0_#111]">
            <span
              className="material-symbols-outlined text-4xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <h1 className="mt-3 text-lg font-extrabold text-on-surface">已送出認領申請</h1>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              您已申請認領「{slot?.productTitle ?? '此款式'}」。這不代表已確定取得商品；若拆盒團未能湊齊人數可能
              <strong className="text-secondary"> 流團</strong>，屆時將另行通知。
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/profile/split-boxes')}
                className="w-full rounded-full premium-gradient py-3 text-sm font-bold text-white"
              >
                查看我參與的拆盒團
              </button>
              <button
                type="button"
                onClick={() => navigate(`/listing/${slot?.listingId ?? listingIdParam ?? ''}`)}
                className="w-full rounded-full border-2 border-outline bg-white py-3 text-sm font-bold text-on-surface"
              >
                返回貼文
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in min-h-full pb-32 duration-500">
      <TopBar showBack title="認領申請" />

      <main className="space-y-6 px-container-margin pt-topbar-content">
        <section className="overflow-hidden rounded-2xl border-2 border-outline bg-white shadow-[4px_4px_0_#111]">
          <div className="flex gap-4 p-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {group.coverImage ? (
                <img src={group.coverImage} alt="" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
              ) : (
                <img src="/split-box.svg" alt="" className="h-full w-full object-contain p-2 opacity-70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                {SPLIT_BOX_STATUS_LABEL[group.status] ?? group.status}
              </p>
              <h1 className="mt-1 text-lg font-extrabold leading-snug">{group.title}</h1>
              <p className="mt-1 text-xs text-on-surface-variant">
                {[group.brand, group.series].filter(Boolean).join(' · ')}
              </p>
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
          </div>
        </section>

        {slot ? (
          <section className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">欲認領款式</h2>
            <div className="mt-3 flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-50">
                {slot.productImage ? (
                  <img src={slot.productImage} alt="" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">{slot.productTitle}</p>
                <p className="mt-1 text-sm font-extrabold text-primary">{slot.price}</p>
              </div>
            </div>
          </section>
        ) : (
          <p className="text-sm font-semibold text-secondary">找不到對應款式，請從貼文或拆盒團重新進入。</p>
        )}

        <section className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">團主資訊</h2>
          <div className="mt-3 flex items-center gap-3">
            <UserAvatar size="md" />
            <div>
              <p className="text-sm font-bold text-on-surface">{group.organizerName}</p>
              <p className="text-xs text-on-surface-variant">負責購盒、出貨與款式分配</p>
            </div>
          </div>
          {group.description ? (
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{group.description}</p>
          ) : null}
          {group.shippingNote ? (
            <p className="mt-2 text-xs text-on-surface-variant">
              <span className="font-bold">備註：</span>
              {group.shippingNote}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">拆盒流程</h2>
          <ol className="mt-3 space-y-4">
            {PROCESS_STEPS.map((step, idx) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border-2 border-secondary/40 bg-secondary/5 p-4">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">info</span>
            <div className="text-xs leading-relaxed text-on-surface">
              <p className="font-bold text-secondary">重要提醒</p>
              <p className="mt-1">
                送出認領申請僅代表您<strong> 有意加入 </strong>此拆盒團，並<strong> 不保證 </strong>最終取得商品。若長時間無法湊齊所需人數，拆盒團可能
                <strong> 流團 </strong>，屆時認領將失效。滿團後團主才會進行購盒與出貨。
              </p>
            </div>
          </div>
        </section>

        {error ? <p className="text-sm font-semibold text-secondary">{error}</p> : null}

        {alreadyMine ? (
          <p className="text-center text-sm font-semibold text-primary">您已認領此款式</p>
        ) : null}

        <section className="space-y-2 pt-2">
          <button
            type="button"
            disabled={submitting || slotUnavailable || Boolean(alreadyMine) || group.isOrganizer}
            onClick={handleSubmitApplication}
            className={cn(
              'w-full rounded-full py-4 text-sm font-extrabold text-white disabled:opacity-50',
              'premium-gradient'
            )}
          >
            {submitting
              ? '送出中…'
              : group.isOrganizer
                ? '團主無法認領'
                : slotUnavailable
                  ? '此款式無法認領'
                  : '送出認領申請'}
          </button>
          <p className="text-center text-[10px] text-on-surface-variant">
            點擊即表示同意上述規則；非立即確認取得商品。
          </p>
        </section>
      </main>
    </div>
  );
}
