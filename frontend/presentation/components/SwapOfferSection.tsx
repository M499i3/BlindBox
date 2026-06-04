import React, { useMemo, useState } from 'react';
import type { Listing } from '@/frontend/domain/entities/listing';
import type { SwapOfferFormValue, SwapProposal } from '@/frontend/domain/entities/swapProposal';
import { DEFAULT_SWAP_OFFER_FORM } from '@/frontend/domain/entities/swapProposal';
import {
  acceptSwapProposal,
  cancelSwapProposal,
  createSwapProposal,
  rejectSwapProposal,
} from '@/frontend/infrastructure/api/swapProposalsApi';
import { uploadImageToStorage } from '@/frontend/infrastructure/storage/supabaseStorage';
import CatalogFieldsSection from '@/frontend/presentation/components/listing/CatalogFieldsSection';
import { useCatalogListingForm } from '@/frontend/presentation/hooks/useCatalogListingForm';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import { cn } from '@/frontend/shared/utils/cn';

const FIELD =
  'w-full rounded-xl border-2 border-outline bg-white px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant ml-0.5';

type Props = {
  wantedListing: Listing;
  myListings: Listing[];
  myProposal: SwapProposal | null;
  incomingProposals: SwapProposal[];
  isSeller: boolean;
  onProposalChange: () => void;
};

function statusLabel(status: SwapProposal['status']): string {
  if (status === 'pending') return '審核中';
  if (status === 'accepted') return '已通過';
  if (status === 'rejected') return '已拒絕';
  if (status === 'cancelled') return '已撤回';
  return '已完成';
}

export default function SwapOfferSection({
  wantedListing,
  myListings,
  myProposal,
  incomingProposals,
  isSeller,
  onProposalChange,
}: Props) {
  const [form, setForm] = useState<SwapOfferFormValue>(DEFAULT_SWAP_OFFER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const catalog = useCatalogListingForm();

  const swapListings = useMemo(
    () => myListings.filter((item) => item.id !== wantedListing.id),
    [myListings, wantedListing.id]
  );

  const filteredStyles = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = catalog.styleOptions;
    if (catalog.itemName.trim()) {
      pool = pool.filter((s) => s.name === catalog.itemName.trim());
    }
    if (!q) return pool.slice(0, 8);
    return pool.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [catalog.styleOptions, catalog.itemName, query]);

  const visibleImageSlots = useMemo(
    () => Math.min(9, Math.max(1, catalog.images.length + 1)),
    [catalog.images.length]
  );

  const patchForm = (patch: Partial<SwapOfferFormValue>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const submitProposal = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      if (form.source === 'existing') {
        if (!form.offeredListingId) {
          alert('請選擇要交換的上架商品');
          return;
        }
        await createSwapProposal({
          wantedListingId: wantedListing.id,
          offeredListingId: form.offeredListingId,
          message: form.message.trim() || undefined,
          additionalAmount: Math.round((Number(form.additionalAmount) || 0) * 100),
        });
      } else {
        if (!catalog.itemName.trim() && !catalog.title.trim()) {
          alert('請選擇款式或填寫商品名稱');
          return;
        }
        const uploadedImages = await catalog.uploadImages();
        await createSwapProposal({
          wantedListingId: wantedListing.id,
          offer: {
            title: catalog.title.trim() || catalog.itemName.trim(),
            itemName: catalog.itemName.trim() || catalog.title.trim(),
            price: 'NT$ 0',
            quantity: 1,
            description: form.description.trim() || '交換提案商品',
            brand: catalog.brand,
            ip: catalog.ip,
            series: catalog.productLine,
            condition: form.condition,
            tradeMode: '我想換',
            shipping: form.shipping,
            allowSwap: true,
            allowBargain: false,
            image: uploadedImages[0] ?? '',
            images: uploadedImages,
          },
          message: form.message.trim() || undefined,
          additionalAmount: Math.round((Number(form.additionalAmount) || 0) * 100),
        });
      }
      onProposalChange();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '送出交換申請失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!myProposal || myProposal.status !== 'pending') return;
    try {
      setActionId(myProposal.id);
      await cancelSwapProposal(myProposal.id);
      onProposalChange();
    } catch (err) {
      console.error(err);
      alert('撤回失敗');
    } finally {
      setActionId(null);
    }
  };

  const handleAccept = async (proposalId: string) => {
    try {
      setActionId(proposalId);
      await acceptSwapProposal(proposalId);
      onProposalChange();
    } catch (err) {
      console.error(err);
      alert('接受失敗');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      setActionId(proposalId);
      await rejectSwapProposal(proposalId);
      onProposalChange();
    } catch (err) {
      console.error(err);
      alert('拒絕失敗');
    } finally {
      setActionId(null);
    }
  };

  if (isSeller) {
    return (
      <section className="rounded-2xl border-2 border-outline bg-white p-5 shadow-none space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface">交換申請</h2>
        {incomingProposals.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">尚無交換申請</p>
        ) : (
          incomingProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-2xl border border-black/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-on-surface">{proposal.proposerName}</p>
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {statusLabel(proposal.status)}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-xl bg-neutral-50 p-2 text-center">
                  <div className="mx-auto mb-2 aspect-square w-16 overflow-hidden rounded-lg">
                    <ListingCardImage src={proposal.offeredListing.image} alt={proposal.offeredListing.title} />
                  </div>
                  <p className="card-title-2 text-[11px] font-semibold leading-snug text-on-surface">{proposal.offeredListing.title}</p>
                </div>
                <span className="material-symbols-outlined text-primary">swap_horiz</span>
                <div className="rounded-xl bg-neutral-50 p-2 text-center">
                  <div className="mx-auto mb-2 aspect-square w-16 overflow-hidden rounded-lg">
                    <ListingCardImage src={proposal.wantedListing.image} alt={proposal.wantedListing.title} />
                  </div>
                  <p className="card-title-2 text-[11px] font-semibold leading-snug text-on-surface">{proposal.wantedListing.title}</p>
                </div>
              </div>
              {proposal.message ? (
                <p className="text-xs text-on-surface-variant">留言：{proposal.message}</p>
              ) : null}
              {proposal.additionalAmount > 0 ? (
                <p className="text-xs font-semibold text-primary">
                  補差價：NT$ {(proposal.additionalAmount / 100).toFixed(0)}
                </p>
              ) : null}
              {proposal.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionId === proposal.id}
                    onClick={() => handleAccept(proposal.id)}
                    className="flex-1 rounded-full border-2 border-outline bg-white py-2.5 text-sm font-bold text-on-surface shadow-[3px_3px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                  >
                    接受
                  </button>
                  <button
                    type="button"
                    disabled={actionId === proposal.id}
                    onClick={() => handleReject(proposal.id)}
                    className="flex-1 rounded-full border border-black/[0.12] py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-50"
                  >
                    拒絕
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    );
  }

  if (myProposal?.status === 'pending') {
    return (
      <section className="rounded-2xl border-2 border-outline bg-white p-5 shadow-none space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface">我的交換提案</h2>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-bold text-primary">審核中，請等待賣家回覆</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-center">
              <div className="mx-auto mb-2 aspect-square w-16 overflow-hidden rounded-lg">
                <ListingCardImage src={myProposal.offeredListing.image} alt={myProposal.offeredListing.title} />
              </div>
              <p className="card-title-2 text-[11px] font-semibold leading-snug">{myProposal.offeredListing.title}</p>
            </div>
            <span className="material-symbols-outlined text-primary">swap_horiz</span>
            <div className="text-center">
              <div className="mx-auto mb-2 aspect-square w-16 overflow-hidden rounded-lg">
                <ListingCardImage src={myProposal.wantedListing.image} alt={myProposal.wantedListing.title} />
              </div>
              <p className="card-title-2 text-[11px] font-semibold leading-snug">{myProposal.wantedListing.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={actionId === myProposal.id}
            className="w-full rounded-full border border-black/[0.12] py-3 text-sm font-bold text-on-surface-variant disabled:opacity-50"
          >
            撤回申請
          </button>
        </div>
      </section>
    );
  }

  if (myProposal?.status === 'accepted') {
    return (
      <section className="rounded-2xl border-2 border-outline bg-white p-5 shadow-none">
        <p className="text-sm font-bold text-emerald-700">交換申請已通過，現在可以聯絡賣家。</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-outline bg-white p-5 shadow-none space-y-5">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface">你想用什麼交換？</h2>
        <p className="mt-1 text-xs text-on-surface-variant">填寫交換商品後送出申請，賣家通過後才能聯絡。</p>
      </div>

      <div className="flex gap-2">
        {(['form', 'existing'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => patchForm({ source: key })}
            className={cn(
              'flex-1 rounded-full border-2 px-3 py-2 text-xs font-bold transition-colors',
              form.source === key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline bg-white text-on-surface-variant'
            )}
          >
            {key === 'form' ? '填寫商品' : '從上架中選'}
          </button>
        ))}
      </div>

      {form.source === 'existing' ? (
        <div className="space-y-2">
          {swapListings.length === 0 ? (
            <p className="text-sm text-on-surface-variant">你還沒有其他上架商品，請改用填寫商品。</p>
          ) : (
            swapListings.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => patchForm({ offeredListingId: item.id, source: 'existing' })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left',
                  form.offeredListingId === item.id ? 'border-primary bg-primary/5' : 'border-outline bg-white'
                )}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <ListingCardImage src={item.image} alt={item.title} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.condition}</p>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: visibleImageSlots }, (_, index) => {
              const image = catalog.images[index];
              return (
                <label
                  key={index}
                  className="relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-outline bg-neutral-50"
                >
                  {image ? (
                    <>
                      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <button
                        type="button"
                        data-no-scroll-top="true"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          catalog.removeImage(index);
                        }}
                        className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                        aria-label="移除照片"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant">add_a_photo</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => catalog.onUploadImage(index, e.target.files?.[0])}
                  />
                </label>
              );
            })}
          </div>

          <CatalogFieldsSection
            brand={catalog.brand}
            ip={catalog.ip}
            productLine={catalog.productLine}
            catalogProductId={catalog.catalogProductId}
            brandOptions={catalog.brandOptions}
            ipOptions={catalog.ipOptions}
            productLineOptions={catalog.productLineOptions}
            styleOptions={catalog.styleOptions}
            productsLoading={catalog.productsLoading}
            onBrandChange={(name, slug) => {
              catalog.setBrand(name);
              catalog.setBrandSlug(slug);
            }}
            onIpChange={(name, slug) => {
              catalog.setIp(name);
              catalog.setIpSlug(slug);
            }}
            onProductLineChange={catalog.setProductLine}
            onStyleChange={catalog.applyCatalogStyle}
          />

          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(FIELD, 'rounded-full py-3 pl-12')}
              placeholder="搜尋圖鑑帶入…"
              type="search"
            />
          </div>
          {filteredStyles.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {filteredStyles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => catalog.applyCatalogStyle(p.id)}
                  className={cn(
                    'aspect-square overflow-hidden rounded-xl border-2',
                    catalog.catalogProductId === p.id ? 'border-primary' : 'border-outline'
                  )}
                >
                  <img src={p.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="swap-item-name">商品名稱</label>
            <input
              id="swap-item-name"
              value={catalog.itemName}
              onChange={(e) => {
                catalog.setItemName(e.target.value);
                catalog.setTitle(e.target.value);
              }}
              className={FIELD}
              placeholder="例如：Molly 經典系列 - 小畫家"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="swap-condition">狀態</label>
            <select
              id="swap-condition"
              value={form.condition}
              onChange={(e) => patchForm({ condition: e.target.value })}
              className={cn(FIELD, 'cursor-pointer')}
            >
              {['全新未拆', '已拆盒', '展示過'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="swap-description">商品描述</label>
            <textarea
              id="swap-description"
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
              className={cn(FIELD, 'min-h-24 resize-none')}
              placeholder="描述瑕疵、配件或交換偏好…"
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label className={LABEL} htmlFor="swap-message">給賣家的留言（選填）</label>
        <textarea
          id="swap-message"
          value={form.message}
          onChange={(e) => patchForm({ message: e.target.value })}
          className={cn(FIELD, 'min-h-20 resize-none')}
          placeholder="例如：希望面交或可小幅補差價…"
        />
      </div>

      <div className="space-y-1.5">
        <label className={LABEL} htmlFor="swap-topup">補差價 NT$（選填）</label>
        <input
          id="swap-topup"
          type="number"
          min={0}
          value={form.additionalAmount}
          onChange={(e) => patchForm({ additionalAmount: e.target.value })}
          className={FIELD}
          placeholder="0"
        />
      </div>

      {myProposal?.status === 'rejected' || myProposal?.status === 'cancelled' ? (
        <p className="text-xs text-on-surface-variant">上次申請未通過，你可以重新提交。</p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={submitProposal}
        className="w-full rounded-full border-2 border-outline bg-white py-4 text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
      >
        {submitting ? '送出中…' : '送出交換申請'}
      </button>
    </section>
  );
}
