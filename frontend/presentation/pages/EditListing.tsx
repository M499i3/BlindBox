import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CatalogFieldsSection from '@/frontend/presentation/components/listing/CatalogFieldsSection';
import IdealSwapTargetsSection, {
  createInitialIdealSwapEntries,
  formatIdealSwapDescription,
  hasValidIdealSwapTargets,
  type IdealSwapEntry,
} from '@/frontend/presentation/components/listing/IdealSwapTargetsSection';
import ListingConditionPicker from '@/frontend/presentation/components/listing/ListingConditionPicker';
import ListingPhotoUpload from '@/frontend/presentation/components/listing/ListingPhotoUpload';
import ShippingPicker from '@/frontend/presentation/components/listing/ShippingPicker';
import {
  LISTING_FIELD,
  LISTING_LABEL,
  LISTING_SECTION,
} from '@/frontend/presentation/components/listing/listingFormStyles';
import TopBar from '@/frontend/presentation/components/TopBar';
import { getListing } from '@/frontend/infrastructure/api/listingsApi';
import { useCatalogListingForm } from '@/frontend/presentation/hooks/useCatalogListingForm';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import {
  parseIdealSwapFromDescription,
  parseListingPriceAmount,
} from '@/frontend/shared/utils/listingDescription';
import { listingShippingOptions } from '@/frontend/shared/utils/listingShipping';
import {
  isSplitBoxListing,
  isSwapListing,
  listingTradeKind,
} from '@/frontend/shared/utils/tradeMode';
import { resolveListingImages } from '@/frontend/shared/utils/listingImage';
import {
  enrichIdealSwapEntries,
  enrichPickerInitialFromListing,
  listingToPickerSeed,
} from '@/frontend/shared/utils/listingPickerInitial';
import type { CatalogProductPickerValue } from '@/frontend/presentation/hooks/useCatalogProductPicker';
import { cn } from '@/frontend/shared/utils/cn';

function idealEntriesFromListing(listing: Listing): IdealSwapEntry[] {
  const { idealTargets } = parseIdealSwapFromDescription(listing.description);
  if (!idealTargets.length) return createInitialIdealSwapEntries();
  return idealTargets.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
  }));
}

export default function EditListing() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { userId, updateListing } = useAppState();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingForm, setPreparingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerInitial, setPickerInitial] =
    useState<Partial<CatalogProductPickerValue> | null>(null);
  const [resolvedIdealEntries, setResolvedIdealEntries] = useState<IdealSwapEntry[] | null>(
    null
  );

  const kind = listing ? listingTradeKind(listing) : 'sell';
  const isSplit = listing ? isSplitBoxListing(listing) : false;
  const isSwap = listing ? isSwapListing(listing) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getListing(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    let cancelled = false;
    setPreparingForm(true);
    setPickerInitial(null);
    setResolvedIdealEntries(null);

    (async () => {
      try {
        const picker = isSplit
          ? ({} as Partial<CatalogProductPickerValue>)
          : await enrichPickerInitialFromListing(listing);
        const ideals = isSwap
          ? await enrichIdealSwapEntries(idealEntriesFromListing(listing))
          : [];
        if (cancelled) return;
        setPickerInitial(picker);
        setResolvedIdealEntries(ideals);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setPickerInitial(isSplit ? {} : listingToPickerSeed(listing));
          setResolvedIdealEntries(isSwap ? idealEntriesFromListing(listing) : []);
        }
      } finally {
        if (!cancelled) setPreparingForm(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listing, isSplit, isSwap]);

  const { supplemental: parsedSupplemental } = useMemo(
    () =>
      listing
        ? parseIdealSwapFromDescription(listing.description)
        : { idealTargets: [], supplemental: '' },
    [listing]
  );

  const formReady =
    pickerInitial !== null && (!isSwap || resolvedIdealEntries !== null);

  if (loading || preparingForm || !formReady) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <p className="text-sm text-on-surface-variant">載入中…</p>
      </div>
    );
  }

  if (!listing || !isOwnListing(listing, userId)) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <p className="text-sm text-on-surface-variant mb-4">找不到貼文或無權限編輯。</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="premium-gradient text-white px-6 py-3 rounded-full text-sm font-bold"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <EditListingForm
      key={`${listing.id}-${pickerInitial.catalogProductId ?? 'x'}`}
      listing={listing}
      kind={kind}
      isSplit={isSplit}
      isSwap={isSwap}
      pickerInitial={pickerInitial}
      parsedSupplemental={parsedSupplemental}
      initialIdealEntries={resolvedIdealEntries ?? createInitialIdealSwapEntries()}
      submitting={submitting}
      onSave={async (input) => {
        setSubmitting(true);
        try {
          await updateListing(listing.id, input);
          navigate(`/listing/${listing.id}`);
        } catch (err) {
          console.error(err);
          alert(err instanceof Error ? err.message : '儲存失敗，請稍後再試');
        } finally {
          setSubmitting(false);
        }
      }}
      onCancel={() => navigate(`/listing/${listing.id}`)}
    />
  );
}

type FormProps = {
  listing: Listing;
  kind: 'sell' | 'split' | 'swap';
  isSplit: boolean;
  isSwap: boolean;
  pickerInitial: Partial<CatalogProductPickerValue>;
  parsedSupplemental: string;
  initialIdealEntries: IdealSwapEntry[];
  submitting: boolean;
  onSave: (input: CreateListingInput) => Promise<void>;
  onCancel: () => void;
};

function EditListingForm({
  listing,
  isSplit,
  isSwap,
  pickerInitial,
  parsedSupplemental,
  initialIdealEntries,
  submitting,
  onSave,
  onCancel,
}: FormProps) {
  const initialImages = resolveListingImages(listing.images, listing.image);
  const catalog = useCatalogListingForm({
    initialPicker: isSplit ? undefined : pickerInitial,
    initialTitle: listing.title,
    initialImages,
  });

  const [condition, setCondition] = useState(listing.condition);
  const [price, setPrice] = useState(parseListingPriceAmount(listing.price));
  const [quantity, setQuantity] = useState(listing.quantity);
  const [description, setDescription] = useState(
    isSwap ? parsedSupplemental : listing.description
  );
  const [allowBargain, setAllowBargain] = useState(listing.allowBargain);
  const [shippingMethods, setShippingMethods] = useState<string[]>(
    listingShippingOptions(listing)
  );
  const [idealEntries, setIdealEntries] = useState<IdealSwapEntry[]>(initialIdealEntries);

  const handleSave = async () => {
    if (!isSplit && !catalog.hasRequiredStyle) {
      alert('請選擇款式');
      return;
    }
    if (!catalog.images.length) {
      alert('請至少保留一張照片');
      return;
    }
    if (isSwap && !hasValidIdealSwapTargets(idealEntries)) {
      alert('請至少完成一筆理想交換商品');
      return;
    }
    if (isSwap) {
      const completed = idealEntries.filter(
        (e) => e.catalogProductId && e.itemName.trim()
      );
      const ids = completed.map((e) => e.catalogProductId);
      if (new Set(ids).size !== ids.length) {
        alert('理想交換款式不可重複');
        return;
      }
      if (ids.includes(catalog.catalogProductId)) {
        alert('理想交換不可與換出商品相同');
        return;
      }
    }
    if (!isSwap && !isSplit) {
      const numericPrice = Number(price);
      if (!numericPrice || numericPrice <= 0) {
        alert('價格必須大於 0 元');
        return;
      }
    }

    const uploadedImages = await catalog.uploadImages();
    const itemLabel = catalog.itemName.trim() || catalog.title.trim() || listing.itemName;
    const title = catalog.title.trim() || itemLabel;

    let bodyDescription = description.trim();
    if (isSwap) {
      const idealBlock = formatIdealSwapDescription(idealEntries);
      bodyDescription = [idealBlock, description.trim()].filter(Boolean).join('\n\n') || '無補充說明';
    } else if (!bodyDescription) {
      bodyDescription = '無補充說明';
    }

    const tradeMode = isSwap ? '我想換' : isSplit ? listing.tradeMode : '我要賣';
    const numericPrice = Number(price);

    await onSave({
      title,
      itemName: isSplit ? listing.itemName : itemLabel,
      catalogProductId: catalog.catalogProductId || listing.catalogProductId,
      price: isSwap ? 'NT$ 0' : `NT$ ${numericPrice || parseListingPriceAmount(listing.price)}`,
      quantity: isSplit ? listing.quantity : quantity,
      description: bodyDescription,
      brand: isSplit ? listing.brand : catalog.brand,
      ip: isSplit ? listing.ip ?? '' : catalog.ip,
      series: isSplit ? listing.series : catalog.productLine,
      condition: isSplit ? listing.condition : condition,
      tradeMode,
      shipping: shippingMethods[0],
      shippingMethods,
      allowSwap: isSwap,
      allowBargain: isSwap ? false : allowBargain,
      image: uploadedImages[0] ?? '',
      images: uploadedImages,
    });
  };

  return (
    <div className="animate-in fade-in pb-28 duration-500">
      <TopBar title="編輯貼文" showBack onBack={onCancel} />
      <main className="space-y-6 px-5 pt-topbar-content">
        {isSplit ? (
          <p className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-xs text-on-surface-variant">
            拆盒團認領貼文僅可編輯標題、照片、描述與出貨方式；款式與價格請至拆盒團頁面調整。
          </p>
        ) : null}

        {!isSplit ? (
          <>
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
            {!isSwap ? (
              <ListingConditionPicker value={condition} onChange={setCondition} />
            ) : null}
          </>
        ) : null}

        {isSwap ? (
          <IdealSwapTargetsSection
            offerCatalogProductId={catalog.catalogProductId}
            entries={idealEntries}
            onChange={setIdealEntries}
          />
        ) : null}

        <ListingPhotoUpload
          images={catalog.images}
          onUpload={catalog.onUploadImage}
          onRemove={catalog.removeImage}
        />

        <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
          <p className={LISTING_SECTION}>貼文內容</p>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL} htmlFor="edit-title">
              貼文標題
            </label>
            <input
              id="edit-title"
              value={catalog.title}
              onChange={(e) => catalog.setTitle(e.target.value)}
              className={LISTING_FIELD}
              type="text"
            />
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL} htmlFor="edit-description">
              {isSwap ? '補充說明' : '商品描述'}
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(LISTING_FIELD, 'resize-none leading-relaxed')}
              rows={4}
            />
          </div>
        </section>

        {!isSwap && !isSplit ? (
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>價格與數量</p>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="edit-price">
                期望售價
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black">
                  NT$
                </span>
                <input
                  id="edit-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={cn(LISTING_FIELD, 'pl-14 text-xl font-black')}
                  type="number"
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="edit-quantity">
                上架數量
              </label>
              <input
                id="edit-quantity"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className={cn(LISTING_FIELD, 'font-black')}
                type="number"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-white p-4">
              <span className="text-sm font-bold uppercase tracking-wider text-black">允許議價</span>
              <button
                type="button"
                role="switch"
                aria-checked={allowBargain}
                onClick={() => setAllowBargain((v) => !v)}
                className={cn(
                  'flex h-7 w-12 items-center rounded-full border-2 border-black px-0.5',
                  allowBargain ? 'bg-black' : 'bg-neutral-200'
                )}
              >
                <span
                  className={cn(
                    'h-5 w-5 rounded-full bg-white transition-transform',
                    allowBargain ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </section>
        ) : null}

        <ShippingPicker value={shippingMethods} onChange={setShippingMethods} />

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSave()}
          className="w-full rounded-full border-2 border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
        >
          {submitting ? '儲存中…' : '儲存變更'}
        </button>
      </main>
    </div>
  );
}
