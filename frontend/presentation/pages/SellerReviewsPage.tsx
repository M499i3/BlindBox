import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { getSellerReviews, type RatingItem } from '@/frontend/infrastructure/api/ratingsApi';

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`material-symbols-outlined text-base ${s <= score ? 'text-accent-amber' : 'text-neutral-300'}`}
          style={{ fontVariationSettings: s <= score ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SellerReviewsPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const sellerName = searchParams.get('name') ?? '賣家';

  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getSellerReviews(userId)
      .then(setRatings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const avg =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : '—';

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-28">
      <TopBar showBack title="賣家評價" />

      <main className="pt-20 pb-32 px-5 max-w-md mx-auto">
        {/* Summary header */}
        <div className="flex flex-col items-center py-8 gap-2">
          <h2 className="text-xl font-extrabold text-on-surface">{sellerName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="material-symbols-outlined text-2xl text-accent-amber"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="text-2xl font-extrabold text-on-surface">{avg}</span>
            <span className="text-sm text-on-surface-variant">/ 5 · {ratings.length} 則評價</span>
          </div>
        </div>

        {loading && (
          <p className="text-center text-sm text-on-surface-variant py-8">載入中…</p>
        )}
        {!loading && ratings.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant py-8">目前還沒有評價</p>
        )}

        <div className="space-y-4">
          {ratings.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar size="sm" />
                  <span className="text-xs font-bold text-on-surface truncate">{r.raterName}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant shrink-0">{formatDate(r.createdAt)}</span>
              </div>
              <StarRow score={r.score} />
              {r.comment ? (
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{r.comment}</p>
              ) : null}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
