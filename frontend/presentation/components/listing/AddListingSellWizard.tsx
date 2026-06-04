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

export default function AddListingSellWizard({ onBack }: Props) {
  const navigate = useNavigate();
  const { createListing } = useAppState();
  const catalog = useCatalogListingForm();
  const [step, setStep] = useState(1);
  const [condition, setCondition] = useState('全新未拆');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [allowBargain, setAllowBargain] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<string[]>(['7-11 店到店']);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      alert('價格必須大於 0 元');
      return;
    }
    if (!catalog.hasRequiredStyle) {
      alert('請選擇款式');
      return;
    }
    try {
      setSubmitting(true);
      const uploadedImages = await catalog.uploadImages();
      const listingId = await createListing({
        title: catalog.title.trim() || catalog.itemName.trim() || '未命名貼文',
        itemName: catalog.itemName.trim() || catalog.title.trim() || '未命名商品',
        catalogProductId: catalog.catalogProductId,
        price: `NT$ ${numericPrice}`,
        quantity,
        description: description.trim() || '無補充說明',
        brand: catalog.brand,
        ip: catalog.ip,
        series: catalog.productLine,
        condition,
        tradeMode: '我要賣',
        shipping: shippingMethods[0],
        shippingMethods,
        allowSwap: false,
        allowBargain,
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
        labels={['商品資訊', '照片描述', '價格交易']}
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
            onStyleChange={catalog.applyCatalogStyle}
          />
          <ListingConditionPicker value={condition} onChange={setCondition} />
          <WizardNav
            onBack={onBack}
            onNext={() => {
              if (!catalog.hasRequiredStyle) {
                alert('請選擇款式');
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
          <ListingPhotoUpload
            images={catalog.images}
            onUpload={catalog.onUploadImage}
            onRemove={catalog.removeImage}
          />
          <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
            <p className={LISTING_SECTION}>貼文內容</p>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="sell-title">
                貼文標題
              </label>
              <input
                id="sell-title"
                value={catalog.title}
                onChange={(e) => catalog.setTitle(e.target.value)}
                className={LISTING_FIELD}
                placeholder="例如：Labubu 稀有款割愛"
                type="text"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="sell-description">
                商品描述
              </label>
              <textarea
                id="sell-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn(LISTING_FIELD, 'resize-none leading-relaxed')}
                placeholder="詳細描述商品細節、瑕疵狀況…"
                rows={4}
              />
            </div>
          </section>
          <WizardNav
            onBack={() => setStep(1)}
            onNext={() => {
              if (!catalog.images.length) {
                alert('請使用推薦圖或上傳至少一張照片');
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
            <p className={LISTING_SECTION}>價格與交易</p>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="sell-price">
                期望售價
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black">NT$</span>
                <input
                  id="sell-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={cn(LISTING_FIELD, 'pl-14 text-xl font-black')}
                  placeholder="0"
                  type="number"
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={LISTING_LABEL} htmlFor="sell-quantity">
                上架數量
              </label>
              <input
                id="sell-quantity"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className={cn(LISTING_FIELD, 'font-black')}
                type="number"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black">payments</span>
                <span className="text-sm font-bold uppercase tracking-wider text-black">允許議價</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowBargain}
                onClick={() => setAllowBargain((v) => !v)}
                className={cn(
                  'flex h-7 w-12 items-center rounded-full border-2 border-black px-0.5 transition-colors',
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
