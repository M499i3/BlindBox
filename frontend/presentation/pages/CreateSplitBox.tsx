import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import TopBar from '@/frontend/presentation/components/TopBar';
import { getCatalogBrands, getCatalogProducts, getCatalogSeries } from '@/frontend/infrastructure/api/catalogApi';
import { fetchCached } from '@/frontend/shared/utils/fetchCache';
import { invalidateMarketplaceCache } from '@/frontend/shared/utils/cacheInvalidation';
import {
  CATALOG_BRANDS_KEY,
  catalogProductsKey,
  catalogSeriesKey,
} from '@/frontend/shared/utils/catalogCacheKeys';
import { createSplitBox } from '@/frontend/infrastructure/api/splitBoxApi';
import type { BrandRow, CatalogProduct, SeriesRow } from '@/frontend/domain/entities/catalog';
import ListingWizardSteps from '@/frontend/presentation/components/listing/ListingWizardSteps';
import {
  LISTING_FIELD,
  LISTING_LABEL,
  LISTING_SECTION,
  SHIPPING_OPTIONS,
} from '@/frontend/presentation/components/listing/listingFormStyles';
import {
  filterProductsByIp,
  productLinesFromProducts,
  productsInLine,
} from '@/frontend/shared/utils/catalogProductLines';
import { cn } from '@/frontend/shared/utils/cn';

type Props = {
  embedded?: boolean;
  onBack?: () => void;
};

type StyleRow = { id: string; name: string; image: string };

export default function CreateSplitBox({ embedded = false, onBack }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState('');
  const [ip, setIp] = useState('');
  const [productLine, setProductLine] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [ipSlug, setIpSlug] = useState('');
  const [brandOptions, setBrandOptions] = useState<BrandRow[]>([]);
  const [ipOptions, setIpOptions] = useState<SeriesRow[]>([]);
  const [brandProducts, setBrandProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [reservedIds, setReservedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [description, setDescription] = useState('');
  const [shipping, setShipping] = useState('7-11 店到店');
  const [closesAt, setClosesAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCached(CATALOG_BRANDS_KEY, getCatalogBrands)
      .then((rows) => {
        if (!rows.length) return;
        setBrandOptions(rows);
        const first = rows[0];
        const slug = first.slug ?? first.name.toLowerCase().replace(/\s+/g, '-');
        setBrand(first.name);
        setBrandSlug(slug);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!brandSlug) return;
    setProductsLoading(true);
    Promise.all([
      fetchCached(catalogSeriesKey(brandSlug), () => getCatalogSeries(brandSlug)),
      fetchCached(catalogProductsKey({ brand: brandSlug }), () =>
        getCatalogProducts({ brand: brandSlug })
      ),
    ])
      .then(([ips, products]) => {
        setIpOptions(ips);
        setBrandProducts(products);
        const first = ips[0];
        setIp(first?.name ?? '');
        setIpSlug(first?.slug ?? '');
        setProductLine('');
        setReservedIds(new Set());
      })
      .catch(() => {
        setIpOptions([]);
        setBrandProducts([]);
        setIp('');
        setIpSlug('');
      })
      .finally(() => setProductsLoading(false));
  }, [brandSlug]);

  const productsForIp = useMemo(
    () => filterProductsByIp(brandProducts, ip),
    [brandProducts, ip]
  );

  const productLineOptions = useMemo(
    () => productLinesFromProducts(productsForIp),
    [productsForIp]
  );

  const styles: StyleRow[] = useMemo(() => {
    const pool = productLine ? productsInLine(productsForIp, productLine) : [];
    return pool.map((p) => ({ id: p.id, name: p.title, image: p.image }));
  }, [productsForIp, productLine]);

  useEffect(() => {
    if (!productLineOptions.length) {
      setProductLine('');
      return;
    }
    if (!productLine || !productLineOptions.includes(productLine)) {
      setProductLine(productLineOptions[0]);
    }
  }, [productLineOptions, productLine]);

  useEffect(() => {
    setReservedIds(new Set());
  }, [productLine, ip]);

  useEffect(() => {
    if (productLine && !title) setTitle(`${productLine} 拆盒團`);
  }, [productLine, title]);

  const claimableCount = styles.length - reservedIds.size;
  const pricePreview = useMemo(() => {
    const total = Number(totalPrice) || 0;
    if (!claimableCount || !total) return '';
    return `約 NT$ ${Math.floor(total / claimableCount)} / 款`;
  }, [totalPrice, claimableCount]);

  const toggleReserved = (id: string) => {
    setReservedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    onBack?.();
  };

  const submit = async () => {
    if (!styles.length) {
      setError('請先選擇有款式的系列');
      return;
    }
    if (claimableCount <= 0) {
      setError('至少需要保留一個可認領款式給其他玩家');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const group = await createSplitBox({
        title: title.trim() || `${productLine} 拆盒團`,
        brand,
        series: ip,
        description: description.trim(),
        coverImage: styles.find((s) => !reservedIds.has(s.id))?.image,
        shipping,
        totalPrice: `NT$ ${totalPrice}`,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
        slots: styles.map((s) => ({
          catalogProductId: s.id,
          productTitle: s.name,
          productImage: s.image,
          reservedByHost: reservedIds.has(s.id),
        })),
      });
      invalidateMarketplaceCache();
      navigateWithReturn(navigate, `/split-box/${group.id}`, location, {
        from: embedded ? '/add-listing' : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '發起失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <ListingWizardSteps current={step} total={3} labels={['選擇商品', '自留款式', '團購設定']} />

      {step === 1 ? (
        <section className="space-y-4">
          <p className={LISTING_SECTION}>選擇商品</p>
          {productsLoading ? (
            <p className="text-xs text-on-surface-variant">載入圖鑑資料…</p>
          ) : null}
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>品牌</label>
            <select
              className={LISTING_FIELD}
              value={brandSlug}
              onChange={(e) => {
                const slug = e.target.value;
                const row = brandOptions.find((b) => (b.slug ?? b.name) === slug);
                setBrandSlug(slug);
                setBrand(row?.name ?? '');
              }}
            >
              {brandOptions.map((b) => {
                const slug = b.slug ?? b.name.toLowerCase().replace(/\s+/g, '-');
                return (
                  <option key={slug} value={slug}>
                    {b.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>IP</label>
            <select
              className={LISTING_FIELD}
              value={ip}
              disabled={!ipOptions.length}
              onChange={(e) => {
                const nextName = e.target.value;
                const row = ipOptions.find((s) => s.name === nextName);
                setIp(nextName);
                setIpSlug(row?.slug ?? '');
              }}
            >
              {ipOptions.length ? (
                ipOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))
              ) : (
                <option value="">（此品牌尚無 IP）</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>系列</label>
            <select
              className={LISTING_FIELD}
              value={productLine}
              disabled={!productLineOptions.length}
              onChange={(e) => setProductLine(e.target.value)}
            >
              {productLineOptions.length ? (
                productLineOptions.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))
              ) : (
                <option value="">（此 IP 尚無系列）</option>
              )}
            </select>
          </div>
          <WizardNav
            onBack={handleBack}
            onNext={() => setStep(2)}
            nextLabel={`下一步（${styles.length} 款）`}
            nextDisabled={!productLine || !styles.length}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <p className={LISTING_SECTION}>自留款式</p>
          <p className="text-xs text-on-surface-variant">勾選團主自留的款式，其餘將自動發布供認領。</p>
          <div className="grid grid-cols-3 gap-3">
            {styles.map((s) => {
              const reserved = reservedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleReserved(s.id)}
                  className={cn(
                    'overflow-hidden rounded-2xl border-2 text-left shadow-[2px_2px_0_#111] transition-colors',
                    reserved ? 'border-primary bg-primary/5' : 'border-outline bg-white'
                  )}
                >
                  <div className="aspect-square bg-neutral-100">
                    {s.image ? (
                      <img src={s.image} alt="" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
                    ) : null}
                  </div>
                  <p className="card-title-2 p-2 text-[10px] font-bold leading-snug">{s.name}</p>
                  <p className="px-2 pb-2 text-[9px] font-bold text-primary">{reserved ? '自留' : '開放認領'}</p>
                </button>
              );
            })}
          </div>
          <WizardNav
            onBack={handleBack}
            onNext={() => setStep(3)}
            nextLabel={`下一步（${claimableCount} 款開放）`}
            nextDisabled={claimableCount <= 0}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <p className={LISTING_SECTION}>團購設定</p>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>拆盒團名稱</label>
            <input className={LISTING_FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>整盒參考價（NT$）</label>
            <input
              className={LISTING_FIELD}
              type="number"
              min={1}
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
            />
            {pricePreview ? <p className="text-xs font-semibold text-primary">{pricePreview}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>截止時間（選填）</label>
            <input className={LISTING_FIELD} type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>出貨方式</label>
            <select className={LISTING_FIELD} value={shipping} onChange={(e) => setShipping(e.target.value)}>
              {SHIPPING_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LISTING_LABEL}>備註</label>
            <textarea className={cn(LISTING_FIELD, 'resize-none')} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error ? <p className="text-sm font-semibold text-secondary">{error}</p> : null}
          <WizardNav
            onBack={handleBack}
            onNext={submit}
            nextLabel={submitting ? '發布中…' : '發布拆盒團'}
            nextDisabled={submitting || !totalPrice}
          />
        </section>
      ) : null}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="animate-in fade-in pb-28 duration-500">
      <TopBar title="發起拆盒團" showBack />
      <main className="space-y-6 px-5 pt-topbar-content">{content}</main>
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
        className="rounded-full border-2 border-black bg-white py-3 text-sm font-bold"
      >
        上一步
      </button>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={onNext}
        className="rounded-full border-2 border-black bg-black py-3 text-sm font-extrabold text-white disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}
