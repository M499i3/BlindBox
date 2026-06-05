import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CatalogHero from '@/frontend/presentation/components/catalog/CatalogHero';
import CatalogBrowseRow from '@/frontend/presentation/components/catalog/CatalogBrowseRow';
import CatalogSectionHeading from '@/frontend/presentation/components/catalog/CatalogSectionHeading';
import { deriveSeriesName } from '@/frontend/shared/utils/catalogHierarchy';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import {
  filterProductsByIp,
  productLinesFromProducts,
} from '@/frontend/shared/utils/catalogProductLines';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import {
  deriveBrandLabel,
  useCatalogBrands,
  useCatalogIps,
  useCatalogProductSeries,
  useCatalogProducts,
} from '@/frontend/presentation/hooks/useCatalog';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';

export default function SeriesDetail() {
  const { id: ipRouteSlug = '' } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();

  const ipSlugParam = decodeURIComponent(ipRouteSlug);
  const dbBrands = useCatalogBrands();
  const brandSlug = useMemo(() => {
    const fromQuery = (searchParams.get('brand') ?? '').trim();
    if (fromQuery) return fromQuery.toLowerCase().replace(/\s+/g, '-');
    const hit = dbBrands.find((b) => (b.slug ?? '').length > 0);
    return hit?.slug ?? 'pop-mart';
  }, [searchParams, dbBrands]);

  const brandTitle = useMemo(() => {
    const hit = dbBrands.find((b) => (b.slug ?? '') === brandSlug);
    return hit?.name ?? brandSlug.replace(/-/g, ' ');
  }, [dbBrands, brandSlug]);

  const { ips: dbIps } = useCatalogIps(mock ? undefined : brandSlug);
  const ipMeta = useMemo(() => {
    if (mock) return null;
    return (
      dbIps.find((i) => i.slug === ipSlugParam) ??
      dbIps.find((i) => i.name.toLowerCase() === ipSlugParam.toLowerCase())
    );
  }, [mock, dbIps, ipSlugParam]);

  const ipName = mock ? ipSlugParam : (ipMeta?.name ?? ipSlugParam);
  const ipSlug = ipMeta?.slug ?? ipSlugParam;

  const { products: catalogProducts } = useCatalogProducts(mock ? undefined : { brand: brandSlug });
  const { productSeries: dbProductLines } = useCatalogProductSeries(
    mock ? undefined : brandSlug,
    mock ? undefined : ipSlug
  );

  const products = useMemo(() => {
    if (mock) {
      return catalogProducts.filter((p) => deriveBrandLabel(p.title) === ipName);
    }
    return filterProductsByIp(catalogProducts, ipName);
  }, [mock, catalogProducts, ipName]);

  const hero =
    ipMeta?.image ??
    products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const productLines = useMemo(() => {
    const productIdsByLineSlug = new Map<string, string[]>();
    for (const p of products) {
      const key = p.seriesSlug ?? p.seriesName ?? '';
      if (!key) continue;
      if (!productIdsByLineSlug.has(key)) productIdsByLineSlug.set(key, []);
      productIdsByLineSlug.get(key)!.push(p.id);
    }

    if (!mock && dbProductLines.length > 0) {
      return dbProductLines.map((line) => ({
        name: line.name,
        slug: line.slug,
        image: line.image || hero,
        count: line.count ?? productIdsByLineSlug.get(line.slug)?.length ?? 0,
        productIds: productIdsByLineSlug.get(line.slug) ?? [],
      }));
    }

    const names = productLinesFromProducts(products);
    return names.map((name) => {
      const lineProducts = products.filter(
        (p) => (p.seriesName ?? deriveSeriesName(p.title)) === name
      );
      const slug = lineProducts[0]?.seriesSlug ?? name;
      return {
        name,
        slug,
        image: lineProducts[0]?.image ?? hero,
        count: lineProducts.length,
        productIds: lineProducts.map((p) => p.id),
      };
    });
  }, [mock, dbProductLines, products, hero]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar title={ipName || 'IP'} showBack rightElement={<></>} />

      <main className="mx-auto w-full min-w-0 max-w-full space-y-8 px-container-margin pt-topbar-content">
        <CatalogHero
          title={ipName || 'IP'}
          subtitle="選擇產品線系列，查看收錄的盲盒款式。"
          breadcrumb={['圖鑑', brandTitle, ipName || 'IP']}
          coverImage={hero}
          stats={[
            { label: '系列', value: productLines.length },
            { label: '商品', value: products.length },
          ]}
        />

        <section>
          <CatalogSectionHeading label="Series" title="系列一覽" count={productLines.length} />
          <div className="space-y-3">
            {productLines.map((line) => (
              <CatalogBrowseRow
                key={line.slug || line.name}
                title={line.name}
                subtitle={ipName}
                image={line.image}
                count={line.count}
                onClick={() => {
                  if (!mock && line.slug) {
                    const qs = new URLSearchParams({
                      brand: brandSlug,
                      series: line.slug,
                      name: line.name,
                      ip: ipName,
                    });
                    navigateWithReturn(navigate, `/subseries?${qs.toString()}`, location);
                    return;
                  }
                  navigateWithReturn(
                    navigate,
                    `/subseries?ip=${encodeURIComponent(ipName)}&name=${encodeURIComponent(line.name)}`,
                    location
                  );
                }}
                isAllWished={line.productIds.length > 0 ? isAllWished(line.productIds) : undefined}
                isAllOwned={line.productIds.length > 0 ? isAllOwned(line.productIds) : undefined}
                onToggleWish={
                  line.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleWishForProductIds(line.productIds);
                      }
                    : undefined
                }
                onToggleOwned={
                  line.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleOwnedForProductIds(line.productIds);
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
