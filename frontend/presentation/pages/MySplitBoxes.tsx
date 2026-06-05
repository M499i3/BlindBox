import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import {
  listMyJoinedSplitBoxes,
  listMyOrganizedSplitBoxes,
} from '@/frontend/infrastructure/api/splitBoxApi';
import {
  SPLIT_BOX_STATUS_LABEL,
  type SplitBoxGroupSummary,
} from '@/frontend/domain/entities/splitBox';
import { computeSplitBoxProgress } from '@/frontend/shared/utils/splitBoxProgress';

function GroupRow({
  group,
  showClaimedSlots,
  onClick,
}: {
  group: SplitBoxGroupSummary;
  showClaimedSlots?: boolean;
  onClick: () => void;
}) {
  const { filled, total } = computeSplitBoxProgress(group);
  const claimedLabels = (group.myClaimedSlots ?? []).map((s) => s.productTitle).filter(Boolean);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border-2 border-outline bg-white p-3 text-left shadow-[3px_3px_0_#111] active:opacity-95"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {group.coverImage ? (
          <img src={group.coverImage} alt="" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{group.title}</p>
        <p className="mt-0.5 text-[11px] text-on-surface-variant">
          {SPLIT_BOX_STATUS_LABEL[group.status] ?? group.status} · {filled}/{total} 進度
        </p>
        {showClaimedSlots && claimedLabels.length > 0 ? (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-primary">
            已認領：{claimedLabels.join('、')}
          </p>
        ) : null}
      </div>
      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </button>
  );
}

export default function MySplitBoxes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'joined' ? 'joined' : 'organized';
  const [organized, setOrganized] = useState<SplitBoxGroupSummary[]>([]);
  const [joined, setJoined] = useState<SplitBoxGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listMyOrganizedSplitBoxes(), listMyJoinedSplitBoxes()])
      .then(([o, j]) => {
        setOrganized(o);
        setJoined(j);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const items = tab === 'joined' ? joined : organized;

  return (
    <div className="animate-in fade-in pb-28 duration-500">
      <TopBar
        title="拆盒團"
        showBack
        rightElement={
          <button
            type="button"
            onClick={() => navigate('/add-listing?type=split')}
            className="text-sm font-bold text-primary"
          >
            發起
          </button>
        }
      />

      <main className="space-y-4 px-5 pt-topbar-content">
        <div className="flex gap-2">
          {[
            { key: 'organized', label: '我發起的' },
            { key: 'joined', label: '我參與的' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSearchParams({ tab: t.key }, { replace: true })}
              className={`rounded-full border-2 px-4 py-2 text-xs font-bold ${
                tab === t.key ? 'border-black bg-black text-white' : 'border-outline bg-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">載入中…</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-on-surface-variant">
              {tab === 'joined' ? '還沒有參與任何拆盒團。' : '還沒有發起拆盒團。'}
            </p>
            {tab === 'organized' ? (
              <button
                type="button"
                onClick={() => navigate('/add-listing?type=split')}
                className="mt-4 rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-bold text-white"
              >
                發起拆盒團
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                showClaimedSlots={tab === 'joined'}
                onClick={() => navigateWithReturn(navigate, `/split-box/${g.id}`, location)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
