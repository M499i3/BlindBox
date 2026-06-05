import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import TopBar from '@/frontend/presentation/components/TopBar';
import CatalogHero from '@/frontend/presentation/components/catalog/CatalogHero';
import CatalogBrowseRow from '@/frontend/presentation/components/catalog/CatalogBrowseRow';
import CatalogSectionHeading from '@/frontend/presentation/components/catalog/CatalogSectionHeading';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import {
  isMockDataEnabled,
  popmartShowcase,
  productsByBrandSlug,
} from '@/frontend/lib/popmartShowcase';
import {
  useCatalogBrands,
  useCatalogIps,
  useCatalogProducts,
} from '@/frontend/presentation/hooks/useCatalog';
import { brandLogoForSlug } from '@/frontend/lib/brandLogos';

function titleCase(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BrandDetail() {
  const { id: slug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();
  const dbBrands = useCatalogBrands();
  const brandSlug = decodeURIComponent(slug).toLowerCase().replace(/\s+/g, '-');
  const { products: apiProducts } = useCatalogProducts({ brand: mock ? undefined : brandSlug });
  const { ips: dbIps } = useCatalogIps(mock ? undefined : brandSlug);

  const displayName = useMemo(() => {
    const fromDb = dbBrands.find((b) => (b.slug ?? '') === brandSlug || b.name.toLowerCase() === brandSlug);
    return fromDb?.name ?? titleCase(slug);
  }, [dbBrands, brandSlug, slug]);

  const isPopmartBrand =
    displayName.toLowerCase().replace(/\s+/g, '') === 'popmart' ||
    displayName.toLowerCase() === 'pop mart';

  const matched = useMemo(() => {
    if (mock) {
      return isPopmartBrand ? popmartShowcase.products : productsByBrandSlug(slug);
    }
    return apiProducts;
  }, [apiProducts, isPopmartBrand, mock, slug]);

  const hero =
    brandLogoForSlug(brandSlug) ||
    dbBrands.find((b) => (b.slug ?? '') === brandSlug)?.image ||
    matched[0]?.image ||
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const ipGrid = useMemo(() => {
    const productIdsByIpSlug = new Map<string, string[]>();
    for (const p of matched) {
      const key = p.ipSlug ?? p.ipName ?? p.id;
      if (!productIdsByIpSlug.has(key)) productIdsByIpSlug.set(key, []);
      productIdsByIpSlug.get(key)!.push(p.id);
    }

    if (!mock && dbIps.length > 0) {
      return dbIps.map((ip) => ({
        key: ip.slug,
        title: ip.name,
        image: ip.image || hero,
        count: ip.count ?? productIdsByIpSlug.get(ip.slug)?.length ?? 0,
        href: `/series/${encodeURIComponent(ip.slug)}?brand=${encodeURIComponent(brandSlug)}`,
        productIds: productIdsByIpSlug.get(ip.slug) ?? [],
      }));
    }
    const map = new Map<string, { key: string; title: string; image: string; count: number; href: string; productIds: string[] }>();
    for (const p of matched) {
      const key = p.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: p.title,
          image: p.image,
          count: 1,
          href: `/search?q=${encodeURIComponent(p.title)}`,
          productIds: [p.id],
        });
      }
    }
    return Array.from(map.values()).slice(0, 30);
  }, [mock, dbIps, matched, brandSlug, hero]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar showBack title={displayName} rightElement={<></>} />

      <main className="mx-auto w-full min-w-0 max-w-full space-y-8 px-container-margin pt-topbar-content">
        <CatalogHero
          title={displayName}
          subtitle="瀏覽此品牌下的 IP，點選進入系列與款式。"
          breadcrumb={['圖鑑', '品牌']}
          coverImage={hero}
          stats={[
            { label: 'IP', value: ipGrid.length },
            { label: '相關商品', value: matched.length },
          ]}
        />

        <section>
          <CatalogSectionHeading label="IP" title="IP 一覽" count={ipGrid.length} />
          <div className="space-y-3">
            {ipGrid.map((item) => (
              <CatalogBrowseRow
                key={item.key}
                title={item.title}
                subtitle={displayName}
                image={item.image}
                count={item.count}
                onClick={() => navigateWithReturn(navigate, item.href, location)}
                isAllWished={item.productIds.length > 0 ? isAllWished(item.productIds) : undefined}
                isAllOwned={item.productIds.length > 0 ? isAllOwned(item.productIds) : undefined}
                onToggleWish={
                  item.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleWishForProductIds(item.productIds);
                      }
                    : undefined
                }
                onToggleOwned={
                  item.productIds.length > 0
                    ? (e) => {
                        e.stopPropagation();
                        toggleOwnedForProductIds(item.productIds);
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
