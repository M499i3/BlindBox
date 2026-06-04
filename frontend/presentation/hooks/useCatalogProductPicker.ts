import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogIps,
} from '@/frontend/infrastructure/api/catalogApi';
import { fetchCached } from '@/frontend/shared/utils/fetchCache';
import {
  CATALOG_BRANDS_KEY,
  catalogProductsKey,
  catalogIpsKey,
} from '@/frontend/shared/utils/catalogCacheKeys';
import type { BrandRow, CatalogProduct, IpRow } from '@/frontend/domain/entities/catalog';
import {
  filterProductsByIp,
  productLinesFromProducts,
  productsInLine,
} from '@/frontend/shared/utils/catalogProductLines';

export type CatalogStyleOption = { id: string; name: string; image: string };

export type CatalogProductPickerValue = {
  catalogProductId: string;
  itemName: string;
  brand: string;
  brandSlug: string;
  ip: string;
  ipSlug: string;
  productLine: string;
};

export type CatalogProductPickerOptions = {
  initial?: Partial<CatalogProductPickerValue>;
};

export function useCatalogProductPicker(options?: CatalogProductPickerOptions) {
  const initial = options?.initial;
  const skipAutoBrand = useRef(Boolean(initial?.brandSlug));
  const pendingHydrate = useRef(initial?.brandSlug ? { ...initial } : null);
  const skipStyleReset = useRef(false);

  const [catalogProductId, setCatalogProductId] = useState(initial?.catalogProductId ?? '');
  const [itemName, setItemName] = useState(initial?.itemName ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [brandSlug, setBrandSlug] = useState(initial?.brandSlug ?? '');
  const [brandOptions, setBrandOptions] = useState<BrandRow[]>([]);
  const [ip, setIp] = useState(initial?.ip ?? '');
  const [ipSlug, setIpSlug] = useState(initial?.ipSlug ?? '');
  const [ipOptions, setIpOptions] = useState<IpRow[]>([]);
  const [productLine, setProductLine] = useState(initial?.productLine ?? '');
  const [brandProducts, setBrandProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    fetchCached(CATALOG_BRANDS_KEY, getCatalogBrands)
      .then((rows) => {
        if (!rows.length) return;
        setBrandOptions(rows);
        if (skipAutoBrand.current) return;
        const first = rows[0];
        const slug = first.slug ?? first.name.toLowerCase().replace(/\s+/g, '-');
        setBrand(first.name);
        setBrandSlug(slug);
      })
      .catch(() => {
        const fallback = [{ name: 'Pop Mart', slug: 'pop-mart', image: '' }];
        setBrandOptions(fallback);
        if (skipAutoBrand.current) return;
        setBrand(fallback[0].name);
        setBrandSlug(fallback[0].slug);
      });
  }, []);

  useEffect(() => {
    if (!brandSlug) return;
    setProductsLoading(true);
    Promise.all([
      fetchCached(catalogIpsKey(brandSlug), () => getCatalogIps(brandSlug)),
      fetchCached(catalogProductsKey({ brand: brandSlug }), () =>
        getCatalogProducts({ brand: brandSlug })
      ),
    ])
      .then(([ips, products]) => {
        setIpOptions(ips);
        setBrandProducts(products);
        const hydrate = pendingHydrate.current;
        if (hydrate?.brandSlug === brandSlug) {
          pendingHydrate.current = null;
          skipStyleReset.current = true;
          if (hydrate.ip) setIp(hydrate.ip);
          if (hydrate.ipSlug) setIpSlug(hydrate.ipSlug);
          if (hydrate.productLine) setProductLine(hydrate.productLine);
          if (hydrate.catalogProductId) setCatalogProductId(hydrate.catalogProductId);
          if (hydrate.itemName) setItemName(hydrate.itemName);
          return;
        }
        const first = ips[0];
        setIp(first?.name ?? '');
        setIpSlug(first?.slug ?? '');
        setProductLine('');
        setCatalogProductId('');
        setItemName('');
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

  const styleOptions: CatalogStyleOption[] = useMemo(() => {
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
    if (skipStyleReset.current) {
      skipStyleReset.current = false;
      return;
    }
    setCatalogProductId('');
    setItemName('');
  }, [productLine, ip]);

  const applyCatalogStyle = (styleId: string) => {
    const style = styleOptions.find((s) => s.id === styleId);
    if (!style) return;
    setCatalogProductId(style.id);
    setItemName(style.name);
  };

  const hasRequiredStyle = Boolean(catalogProductId && itemName.trim());

  const value: CatalogProductPickerValue = {
    catalogProductId,
    itemName,
    brand,
    brandSlug,
    ip,
    ipSlug,
    productLine,
  };

  return {
    value,
    catalogProductId,
    itemName,
    brand,
    setBrand,
    brandSlug,
    setBrandSlug,
    brandOptions,
    ip,
    setIp,
    ipSlug,
    setIpSlug,
    ipOptions,
    productLine,
    setProductLine,
    productLineOptions,
    styleOptions,
    productsLoading,
    applyCatalogStyle,
    hasRequiredStyle,
    setCatalogProductId,
    setItemName,
  };
}
