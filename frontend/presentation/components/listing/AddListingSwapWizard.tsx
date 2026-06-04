import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import CatalogFieldsSection from '@/frontend/presentation/components/listing/CatalogFieldsSection';
import IdealSwapTargetsSection, {
  createInitialIdealSwapEntries,
  formatIdealSwapDescription,
  hasValidIdealSwapTargets,
  type IdealSwapEntry,
} from '@/frontend/presentation/components/listing/IdealSwapTargetsSection';
import ListingConditionPicker from '@/frontend/presentation/components/listing/ListingConditionPicker';
import ListingPhotoUpload from '@/frontend/presentation/components/listing/ListingPhotoUpload';
import ListingWizardSteps from '@/frontend/presentation/components/listing/ListingWizardSteps';
import ShippingPicker from '@/frontend/presentation/components/listing/ShippingPicker';
import {
  LISTING_FIELD,
  LISTING_LABEL,
  LISTING_SECTION,
} from '@/frontend/presentation/components/listing/listingFormStyles';
import { useCatalogListingForm } from '@/frontend/presentation/hooks/useCatalogListingForm';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { cn } from '@/frontend/shared/utils/cn';

type Props = {
  onBack: () => void;
};

export default function AddListingSwapWizard({ onBack }: Props) {
  const navigate = useNavigate();
  const { createListing } = useAppState();
  const catalog = useCatalogListingForm();
  const [step, setStep] = useState(1);
  const [condition, setCondition] = useState('全新未拆');
  const [idealEntries, setIdealEntries] = useState<IdealSwapEntry[]>(
    createInitialIdealSwapEntries
  );
  const [description, setDescription] = useState('');
  const [shippingMethods, setShippingMethods] = useState<string[]>(['7-11 店到店']);
  const [submitting, setSubmitting] = useState(false);

  const completedIdeal = idealEntries.filter(
    (e) => e.catalogProductId && e.itemName.trim()
  );

  const submit = async () => {
    if (submitting) return;
    if (!catalog.hasRequiredStyle) {
      alert('請選擇款式');
      return;
    }
    if (!catalog.images.length) {
      alert('請使用推薦圖或上傳至少一張照片');
      return;
    }
    if (!hasValidIdealSwapTargets(idealEntries)) {
      alert('請至少選擇一筆理想交換商品');
      return;
    }
    try {
      setSubmitting(true);
      const uploadedImages = await catalog.uploadImages();
      const itemLabel = catalog.itemName.trim() || catalog.title.trim() || '未命名商品';
      const title = catalog.title.trim() || `想換 ${itemLabel}`;
      const idealBlock = formatIdealSwapDescription(idealEntries);
      const body = [idealBlock, description.trim()].filter(Boolean).join('\n\n') || '無補充說明';

      const listingId = await createListing({
        title,
        itemName: itemLabel,
        catalogProductId: catalog.catalogProductId,
        price: 'NT$ 0',
        quantity: 1,
        description: body,
        brand: catalog.brand,
        ip: catalog.ip,
        series: catalog.productLine,
        condition,
        tradeMode: '我想換',
        shipping: shippingMethods[0],
        shippingMethods,
        allowSwap: true,
        allowBargain: false,
        image: uploadedImages[0] ?? '',
        images: uploadedImages,
      });
      navigate(`/listing/${listingId}`);
    } catch (err) {
      console.error(err);
      alert('上架失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ListingWizardSteps
        current={step}
        total={3}
        labels={['換出商品', '理想交換', '確認上架']}
      />

      {step === 1 ? (
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
            onStyleChange={(id) => {
              catalog.applyCatalogStyle(id);
              const style = catalog.styleOptions.find((s) => s.id === id);
              if (style && !catalog.title) catalog.setTitle(`想換 ${style.name}`);
            }}
          />
          <ListingConditionPicker value={condition} onChange={setCondition} />
          <ListingPhotoUpload
            images={catalog.images}
            onUpload={catalog.onUploadImage}
            onRemove={catalog.removeImage}
          />
          <WizardNav
            onBack={onBack}
            onNext={() => {
              if (!catalog.hasRequiredStyle) {
                alert('請選擇款式');
                return;
              }
              if (!catalog.images.length) {
                alert('請使用推薦圖或上傳至少一張照片');
                return;
              }
              setStep(2);
            }}
            nextLabel="下一步"
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <IdealSwapTargetsSection
            offerCatalogProductId={catalog.catalogProductId}
            entries={idealEntries}
            onChange={setIdealEntries}
          />
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>貼文標題</p>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="swap-title">
                標題
              </label>
              <input
                id="swap-title"
                value={catalog.title}
                onChange={(e) => catalog.setTitle(e.target.value)}
                className={LISTING_FIELD}
                placeholder="例如：想換 Labubu 隱藏款"
                type="text"
              />
            </div>
          </section>
          <WizardNav
            onBack={() => setStep(1)}
            onNext={() => {
              if (!hasValidIdealSwapTargets(idealEntries)) {
                alert('請至少完成一筆理想交換商品（品牌／IP／系列／款式）');
                return;
              }
              const ids = completedIdeal.map((e) => e.catalogProductId);
              if (new Set(ids).size !== ids.length) {
                alert('理想交換款式不可重複');
                return;
              }
              if (ids.includes(catalog.catalogProductId)) {
                alert('理想交換不可與換出商品相同');
                return;
              }
              setStep(3);
            }}
            nextLabel="下一步"
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>交易說明</p>
            {completedIdeal.length > 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-xs text-on-surface-variant">
                <p className="font-bold text-on-surface mb-1">理想交換（{completedIdeal.length} 款）</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {completedIdeal.map((e) => (
                    <li key={e.catalogProductId}>
                      {e.brand} · {e.ip} · {e.productLine} · {e.itemName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="swap-description">
                補充說明
              </label>
              <textarea
                id="swap-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn(LISTING_FIELD, 'resize-none leading-relaxed')}
                placeholder="交換偏好、面交地點、可接受的差價…"
                rows={4}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              交換貼文不顯示售價，買家需提出交換申請後由你審核。
            </p>
          </section>
          <ShippingPicker value={shippingMethods} onChange={setShippingMethods} />
          <WizardNav
            onBack={() => setStep(2)}
            onNext={submit}
            nextLabel={submitting ? '上傳中…' : '確認上架'}
            nextDisabled={submitting}
          />
        </>
      ) : null}
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border-2 border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-neutral-50 active:scale-95"
      >
        上一步
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={nextDisabled}
        onClick={onNext}
        className="rounded-full border-2 border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-white active:scale-95 disabled:opacity-60"
      >
        {nextLabel}
      </motion.button>
    </div>
  );
}
