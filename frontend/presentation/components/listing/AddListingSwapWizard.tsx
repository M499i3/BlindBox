import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import CatalogFieldsSection from '@/frontend/presentation/components/listing/CatalogFieldsSection';
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
  const [idealSwap, setIdealSwap] = useState('');
  const [description, setDescription] = useState('');
  const [shippingMethods, setShippingMethods] = useState<string[]>(['7-11 店到店']);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      setSubmitting(true);
      const uploadedImages = await catalog.uploadImages();
      const itemLabel = catalog.itemName.trim() || catalog.title.trim() || '未命名商品';
      const title = catalog.title.trim() || `想換 ${itemLabel}`;
      const idealBlock = idealSwap.trim() ? `【理想交換】${idealSwap.trim()}` : '';
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
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>想換到什麼</p>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="swap-ideal">
                理想交換物
              </label>
              <textarea
                id="swap-ideal"
                value={idealSwap}
                onChange={(e) => setIdealSwap(e.target.value)}
                className={cn(LISTING_FIELD, 'resize-none leading-relaxed')}
                placeholder="例如：同系列 hidden 款、特定 IP 的盲盒…"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="swap-title">
                貼文標題
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
          <WizardNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="下一步" />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>交易說明</p>
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
