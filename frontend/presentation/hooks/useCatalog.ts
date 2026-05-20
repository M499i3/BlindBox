import { useMemo } from 'react';
import { useAppServices } from '@/frontend/presentation/providers/AppServicesProvider';

/** 圖鑑／官網商品 — 業務邏輯經 CatalogService */
export function useCatalog() {
  const { catalogService } = useAppServices();

  return useMemo(
    () => ({
      showcase: catalogService.getShowcase(),
      getProductById: (id: string) => catalogService.getProductById(id),
      searchProducts: (q: string) => catalogService.searchProducts(q),
      productsByBrandSlug: (slug: string) =>
        catalogService.productsByBrandSlug(slug),
      deriveBrandLabel: (title: string) =>
        catalogService.deriveBrandLabel(title),
      buildBrandRow: (max?: number) =>
        catalogService.buildBrandRow(catalogService.getShowcase().products, max),
    }),
    [catalogService]
  );
}
