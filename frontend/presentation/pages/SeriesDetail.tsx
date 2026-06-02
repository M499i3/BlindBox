import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CatalogHero from '@/frontend/presentation/components/catalog/CatalogHero';
import CatalogBrowseRow from '@/frontend/presentation/components/catalog/CatalogBrowseRow';
import CatalogSectionHeading from '@/frontend/presentation/components/catalog/CatalogSectionHeading';
import { deriveSeriesName } from '@/frontend/shared/utils/catalogHierarchy';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import {
  deriveBrandLabel,
  useCatalogBrands,
  useCatalogProducts,
  useCatalogSeries,
} from '@/frontend/presentation/hooks/useCatalog';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';

function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

export default function SeriesDetail() {
  const { id: ipSlug = '' } = useParams();
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();

  const ip = decodeURIComponent(ipSlug);
  const dbBrands = useCatalogBrands();
  const brandSlug = useMemo(() => {
    const direct = slugifyLabel(ip);
    const hit = dbBrands.find(
      (b) =>
        (b.slug ?? '').toLowerCase() === direct ||
        b.name.toLowerCase() === ip.toLowerCase()
    );
    return hit?.slug ?? direct;
  }, [dbBrands, ip]);

  const { products: catalogProducts } = useCatalogProducts(mock ? undefined : { brand: brandSlug });
  const { series: dbSeries } = useCatalogSeries(mock ? undefined : brandSlug);

  const products = mock
    ? catalogProducts.filter((p) => deriveBrandLabel(p.title) === ip)
    : catalogProducts;

  const hero =
    products[0]?.image ??
    dbSeries[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const subseries = useMemo(() => {
    const productIdsBySeries = new Map<string, string[]>();
    for (const p of products) {
      const key = p.seriesSlug ?? deriveSeriesName(p.title) ?? '';
      if (!key) continue;
      if (!productIdsBySeries.has(key)) productIdsBySeries.set(key, []);
      productIdsBySeries.get(key)!.push(p.id);
    }

    if (!mock && dbSeries.length > 0) {
      return dbSeries.map((s) => ({
        name: s.name,
        slug: s.slug,
        image: s.image || hero,
        count: s.count ?? productIdsBySeries.get(s.slug)?.length ?? 0,
        productIds: productIdsBySeries.get(s.slug) ?? [],
      }));
    }
    const map = new Map<string, { name: string; image: string; count: number; productIds: string[] }>();
    for (const p of products) {
      const s = deriveSeriesName(p.title);
      if (!s) continue;
      if (!map.has(s)) map.set(s, { name: s, image: p.image, count: 0, productIds: [] });
      const row = map.get(s)!;
      row.count += 1;
      row.productIds.push(p.id);
    }
    return Array.from(map.values()).slice(0, 40);
  }, [mock, dbSeries, products, hero]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar title={ip || 'IP'} showBack rightElement={<></>} />

      <main className="mx-auto w-full min-w-0 max-w-full space-y-8 px-container-margin pt-topbar-content">
        <CatalogHero
          title={ip || 'IP'}
          subtitle="選擇系列，查看收錄的盲盒款式。"
          breadcrumb={['圖鑑', ip || 'IP']}
          coverImage={hero}
          stats={[
            { label: '系列', value: subseries.length },
            { label: '商品', value: products.length },
          ]}
        />

        <section>
          <CatalogSectionHeading label="Series" title="系列一覽" count={subseries.length} />
          <div className="space-y-3">
            {subseries.map((s) => (
              <CatalogBrowseRow
                key={'slug' in s && s.slug ? s.slug : s.name}
                title={s.name}
                subtitle={ip}
                image={s.image}
                count={s.count}
                onClick={() => {
                  if (!mock && 'slug' in s && s.slug) {
                    navigate(
                      `/subseries?brand=${encodeURIComponent(brandSlug)}&series=${encodeURIComponent(s.slug)}&name=${encodeURIComponent(s.name)}`
                    );
                    return;
                  }
                  navigate(`/subseries?ip=${encodeURIComponent(ip)}&name=${encodeURIComponent(s.name)}`);
                }}
                isAllWished={s.productIds.length > 0 ? isAllWished(s.productIds) : undefined}
                isAllOwned={s.productIds.length > 0 ? isAllOwned(s.productIds) : undefined}
                onToggleWish={
                  s.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleWishForProductIds(s.productIds);
                      }
                    : undefined
                }
                onToggleOwned={
                  s.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleOwnedForProductIds(s.productIds);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
