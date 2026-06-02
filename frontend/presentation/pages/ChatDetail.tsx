import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import {
  getChat,
  getChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatContext,
  type ChatMessage,
} from '@/frontend/infrastructure/api/chatsApi';
import { createOrder } from '@/frontend/infrastructure/api/ordersApi';

export default function ChatDetail() {
  const { id: chatId = '' } = useParams();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<ChatContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const load = useCallback(async () => {
    if (!chatId) return;
    const [header, msgs] = await Promise.all([getChat(chatId), getChatMessages(chatId)]);
    setCtx(header);
    setMessages(msgs);
    await markChatRead(chatId).catch(console.error);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [chatId, load]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !chatId || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(chatId, text);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!ctx?.listingId || ordering) return;
    setOrdering(true);
    try {
      const order = await createOrder(ctx.listingId);
      if (order.chatId) {
        await load();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrdering(false);
    }
  };


  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
      <TopBar
        showBack
        title={ctx?.counterpartyName ?? '聊天'}
        rightElement={
          <button type="button" onClick={() => navigate('/search')} className="text-black" aria-label="搜尋">
            <span className="material-symbols-outlined">search</span>
          </button>
        }
      />

      <section className="shrink-0 px-container-margin pt-topbar-content pb-stack-md">
        <div className="rounded-xl border-2 border-outline bg-white shadow-none p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-black/[0.08]">
              {ctx?.listingImage && (
                <img className="w-full h-full object-cover" src={ctx.listingImage} referrerPolicy="no-referrer" alt="" />
              )}
            </div>
            <div className="flex flex-col overflow-hidden text-sm min-w-0">
              <span className="font-bold text-on-surface truncate">{ctx?.listingTitle ?? '商品'}</span>
              {ctx?.statusLabel && (
                <span className="text-[10px] font-bold text-primary">{ctx.statusLabel}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {ctx?.listingId && !ctx?.orderId && ctx?.status !== 'swapping' && (
              <button
                type="button"
                disabled={ordering}
                onClick={handleCreateOrder}
                className="text-[10px] font-bold text-primary px-2 py-1 rounded-lg border border-primary/30"
              >
                {ordering ? '處理中…' : '下單'}
              </button>
            )}
            <button
              type="button"
              onClick={() => ctx?.listingId && navigate(`/listing/${ctx.listingId}`)}
              className="doodle-press premium-gradient text-white px-4 py-2 rounded-full text-[10px] font-bold transition-transform whitespace-nowrap"
            >
              查看商品
            </button>
          </div>
        </div>
      </section>

      <main className="app-scroll min-h-0 flex-1 overflow-y-auto no-scrollbar px-container-margin pb-4 flex flex-col gap-6">
        {loading && <p className="text-center text-sm text-on-surface-variant">載入中…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant">尚無訊息</p>
        )}
        {messages.map((msg) =>
          msg.type === 'system' ? (
            <div key={msg.id} className="flex justify-center">
              <span className="text-[10px] text-on-surface-variant bg-white/80 px-3 py-1 rounded-full uppercase tracking-widest font-bold border border-black/[0.06]">
                {msg.content}
              </span>
            </div>
          ) : msg.type === 'swap_proposal' ? (
            <div key={msg.id} className="flex justify-center">
              <div className="max-w-[90%] rounded-2xl border-2 border-outline bg-white p-4 text-center shadow-none">
                <span className="material-symbols-outlined text-primary">swap_horiz</span>
                <p className="mt-2 text-sm font-bold text-on-surface">交換提案</p>
                <p className="mt-1 text-xs text-on-surface-variant">{msg.content}</p>
                <span className="mt-2 block text-[10px] text-on-surface-variant">{msg.timeLabel}</span>
              </div>
            </div>
          ) : msg.isMine ? (
            <div key={msg.id} className="flex flex-col gap-1 items-end max-w-[85%] self-end">
              <div className="premium-gradient p-3 rounded-2xl rounded-br-sm text-white text-sm">
                {msg.content}
              </div>
              <span className="text-[10px] text-on-surface-variant mr-1 text-right flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">done_all</span>
                {msg.timeLabel}
              </span>
            </div>
          ) : (
            <div key={msg.id} className="flex items-end gap-2 max-w-[85%] self-start">
              <UserAvatar size="sm" className="flex-shrink-0 border border-black/[0.08]" />
              <div className="flex flex-col gap-1">
                <div className="bg-white border border-black/[0.08] p-3 rounded-2xl rounded-bl-sm text-on-surface text-sm">
                  {msg.content}
                </div>
                <span className="text-[10px] text-on-surface-variant ml-1">{msg.timeLabel}</span>
              </div>
            </div>
          )
        )}
      </main>



      
      <footer className="shrink-0 z-50 w-full min-w-0 border-t border-black/[0.08] bg-white/95 px-4 pb-8 pt-4 backdrop-blur-md">
  <div className="mx-auto flex w-full min-w-0 max-w-full items-center gap-3 text-sm">
    <button
      type="button"
      className="doodle-press w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-outline text-on-surface-variant shadow-[2px_2px_0_#111] transition-transform"
    >
      <span className="material-symbols-outlined">add</span>
    </button>
          <div className="flex-1 relative group">
            <input
              
              className="w-full bg-white border border-black/[0.08] rounded-2xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary/40 transition-all"
              placeholder="輸入訊息..."
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button
            type="button"

            disabled={sending || !draft.trim()}
            onClick={handleSend}
            className="doodle-press w-10 h-10 flex items-center justify-center rounded-full premium-gradient text-white shadow-[2px_2px_0_#111] transition-transform disabled:opacity-50"

          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
