import React from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';

const blocks = [
  { id: 'system', title: '系統通知', body: '帳號安全、條款更新等系統訊息會出現在這裡。' },
  { id: 'news', title: '活動快訊', body: '限時活動、新品預告與門市資訊。' },
  { id: 'trade', title: '交易通知', body: '有人下單、已出貨、已取貨等交易狀態。' },
];

export default function NotificationsHub() {
  const [params] = useSearchParams();
  const focus = params.get('type');

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="通知中心" showBack />
      <main className="pt-20 px-5 space-y-4 max-w-md mx-auto">
        {blocks.map((b) => (
          <section
            key={b.id}
            className={`glass-card rounded-2xl p-5 ${focus === b.id ? 'ring-2 ring-primary/40' : ''}`}
          >
            <h2 className="text-lg font-bold text-on-surface mb-2">{b.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">{b.body}</p>
            <p className="text-xs text-on-surface-variant mt-3">（原型：之後接後端推播 / 收件匣）</p>
          </section>
        ))}
      </main>
    </div>
  );
}
