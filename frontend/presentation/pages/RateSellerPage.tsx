import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { submitRating } from '@/frontend/infrastructure/api/ordersApi';

export default function RateSellerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('orderId') ?? '';
  const sellerName = searchParams.get('sellerName') ?? '賣家';

  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      await submitRating(orderId, score, comment.trim() || undefined);
      setDone(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-28">
      <TopBar showBack title="評價賣家" />

      <main className="pt-20 pb-32 px-5 max-w-md mx-auto">
        {done ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <span
              className="material-symbols-outlined text-6xl text-accent-amber"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <h2 className="text-2xl font-extrabold text-on-surface text-center">評價已送出！</h2>
            <p className="text-sm text-on-surface-variant text-center">感謝您的評價，有助於建立更好的交易社群。</p>
            <button
              type="button"
              onClick={() => navigate('/purchase-history', { replace: true })}
              className="mt-4 px-8 py-3 rounded-full premium-gradient text-white font-bold shadow-lg"
            >
              回到購買紀錄
            </button>
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            <div className="text-center">
              <p className="text-on-surface-variant text-sm mb-1">為這次與</p>
              <h2 className="text-xl font-extrabold text-on-surface">{sellerName}</h2>
              <p className="text-on-surface-variant text-sm mt-1">的交易評分</p>
            </div>

            {/* Star picker */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(s)}
                  className="transition-transform active:scale-90"
                  aria-label={`${s} 顆星`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl transition-colors ${
                      s <= score ? 'text-accent-amber' : 'text-neutral-300'
                    }`}
                    style={{ fontVariationSettings: s <= score ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            {score > 0 && (
              <p className="text-center text-xs font-bold text-on-surface-variant">
                {['', '非常差', '不太好', '普通', '很好', '非常好！'][score]}
              </p>
            )}

            {/* Comment */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                留下評語（選填）
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="分享這次的交易體驗…"
                rows={4}
                maxLength={300}
                className="w-full rounded-2xl border-2 border-outline bg-white px-4 py-3 text-sm text-on-surface resize-none focus:border-primary focus:outline-none"
              />
              <p className="text-right text-[10px] text-on-surface-variant">{comment.length}/300</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={score === 0 || submitting}
                onClick={() => void handleSubmit()}
                className="w-full py-4 rounded-full premium-gradient text-white font-bold shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {submitting ? '送出中…' : '送出評價'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/purchase-history', { replace: true })}
                className="w-full py-3 rounded-full text-sm font-bold bg-white border border-black/[0.12] text-on-surface-variant"
              >
                略過
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
