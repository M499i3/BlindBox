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

function hasPickerInitial(initial?: Partial<CatalogProductPickerValue>): boolean {
  if (!initial) return false;
  return Boolean(
    initial.brand?.trim() ||
      initial.catalogProductId?.trim() ||
      initial.productLine?.trim() ||
      initial.itemName?.trim()
  );
}

export function useCatalogProductPicker(options?: CatalogProductPickerOptions) {
  const initial = options?.initial;
  const restoreMode = useRef(hasPickerInitial(initial));
  const pendingHydrate = useRef<Partial<CatalogProductPickerValue> | null>(
    restoreMode.current && initial ? { ...initial } : null
  );
  const skipStyleReset = useRef(false);
  const skipProductLineDefault = useRef(false);

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

  const applyHydrate = (hydrate: Partial<CatalogProductPickerValue>, ips: IpRow[]) => {
    skipStyleReset.current = true;
    skipProductLineDefault.current = true;
    if (hydrate.brand) setBrand(hydrate.brand);
    if (hydrate.ip) {
      const ipRow = ips.find((row) => row.name === hydrate.ip || row.slug === hydrate.ipSlug);
      setIp(ipRow?.name ?? hydrate.ip);
      setIpSlug(ipRow?.slug ?? hydrate.ipSlug ?? '');
    }
    if (hydrate.productLine) setProductLine(hydrate.productLine);
    if (hydrate.catalogProductId) setCatalogProductId(hydrate.catalogProductId);
    if (hydrate.itemName) setItemName(hydrate.itemName);
  };

  useEffect(() => {
    fetchCached(CATALOG_BRANDS_KEY, getCatalogBrands)
      .then((rows) => {
        if (!rows.length) return;
        setBrandOptions(rows);
        if (!restoreMode.current) {
          const first = rows[0];
          const slug = first.slug ?? first.name.toLowerCase().replace(/\s+/g, '-');
          setBrand(first.name);
          setBrandSlug(slug);
          return;
        }
        const seed = pendingHydrate.current ?? initial ?? {};
        const match = rows.find((r) => r.name === seed.brand);
        if (match) {
          const slug = match.slug ?? match.name.toLowerCase().replace(/\s+/g, '-');
          setBrand(match.name);
          setBrandSlug(slug);
          if (pendingHydrate.current) {
            pendingHydrate.current = { ...pendingHydrate.current, brand: match.name, brandSlug: slug };
          }
          return;
        }
        if (seed.brand) {
          setBrand(seed.brand);
        }
        if (seed.brandSlug) {
          setBrandSlug(seed.brandSlug);
        }
      })
      .catch(() => {
        const fallback = [{ name: 'Pop Mart', slug: 'pop-mart', image: '' }];
        setBrandOptions(fallback);
        if (!restoreMode.current) {
          setBrand(fallback[0].name);
          setBrandSlug(fallback[0].slug);
        }
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
        if (hydrate && (hydrate.brandSlug === brandSlug || !hydrate.brandSlug)) {
          pendingHydrate.current = null;
          const merged = { ...hydrate, brandSlug };
          applyHydrate(merged, ips);
          return;
        }
        if (restoreMode.current) return;
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
        if (!restoreMode.current) {
          setIp('');
          setIpSlug('');
        }
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
    if (skipProductLineDefault.current) {
      skipProductLineDefault.current = false;
      if (productLine && productLineOptions.includes(productLine)) return;
      if (!productLineOptions.length) setProductLine('');
      return;
    }
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

  const clearRestore = () => {
    restoreMode.current = false;
    pendingHydrate.current = null;
  };

  return {
    value,
    catalogProductId,
    itemName,
    brand,
    setBrand,
    brandSlug,
    setBrandSlug: (slug: string) => {
      clearRestore();
      setBrandSlug(slug);
    },
    brandOptions,
    ip,
    setIp: (name: string) => {
      clearRestore();
      setIp(name);
    },
    ipSlug,
    setIpSlug: (slug: string) => {
      clearRestore();
      setIpSlug(slug);
    },
    ipOptions,
    productLine,
    setProductLine: (line: string) => {
      clearRestore();
      setProductLine(line);
    },
    productLineOptions,
    styleOptions,
    productsLoading,
    applyCatalogStyle,
    hasRequiredStyle,
    setCatalogProductId,
    setItemName,
  };
}
