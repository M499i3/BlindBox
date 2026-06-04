import { useEffect, useMemo, useState } from 'react';
import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogSeries,
} from '@/frontend/infrastructure/api/catalogApi';
import { fetchCached } from '@/frontend/shared/utils/fetchCache';
import {
  CATALOG_BRANDS_KEY,
  catalogProductsKey,
  catalogSeriesKey,
} from '@/frontend/shared/utils/catalogCacheKeys';
import { uploadImageToStorage } from '@/frontend/infrastructure/storage/supabaseStorage';
import type { BrandRow, CatalogProduct, SeriesRow } from '@/frontend/domain/entities/catalog';
import {
  filterProductsByIp,
  productLinesFromProducts,
  productsInLine,
} from '@/frontend/shared/utils/catalogProductLines';

export type CatalogStyleOption = { id: string; name: string; image: string };

export function useCatalogListingForm() {
  const [images, setImages] = useState<string[]>([]);
  const [localImageFiles, setLocalImageFiles] = useState<(File | null)[]>([]);
  const [recommendedImage, setRecommendedImage] = useState('');
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [catalogProductId, setCatalogProductId] = useState('');

  const [brand, setBrand] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [brandOptions, setBrandOptions] = useState<BrandRow[]>([]);

  const [ip, setIp] = useState('');
  const [ipSlug, setIpSlug] = useState('');
  const [ipOptions, setIpOptions] = useState<SeriesRow[]>([]);

  const [productLine, setProductLine] = useState('');
  const [brandProducts, setBrandProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

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
      .catch(() => {
        const fallback = [{ name: 'Pop Mart', slug: 'pop-mart', image: '' }];
        setBrandOptions(fallback);
        setBrand(fallback[0].name);
        setBrandSlug(fallback[0].slug);
      });
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
    setCatalogProductId('');
    setItemName('');
  }, [productLine, ip]);

  const onUploadImage = (index: number, file?: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = previewUrl;
      return next.slice(0, 9);
    });
    setLocalImageFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next.slice(0, 9);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setLocalImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const applyCatalogStyle = (styleId: string) => {
    const style = styleOptions.find((s) => s.id === styleId);
    if (!style) return;
    setCatalogProductId(style.id);
    setItemName(style.name);
    if (!title.trim()) setTitle(style.name);
    if (style.image) {
      setRecommendedImage(style.image);
      setImages([style.image]);
      setLocalImageFiles([]);
    }
  };

  const useRecommendedImage = () => {
    if (!recommendedImage) return;
    setImages([recommendedImage]);
    setLocalImageFiles([]);
  };

  const uploadImages = async () => {
    return Promise.all(
      images.map(async (img, idx) => {
        const file = localImageFiles[idx];
        if (!file) return img;
        return uploadImageToStorage({ file, folder: 'listings' });
      })
    );
  };

  const hasRequiredStyle = Boolean(catalogProductId && itemName.trim());

  return {
    images,
    title,
    setTitle,
    itemName,
    setItemName,
    catalogProductId,
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
    recommendedImage,
    applyCatalogStyle,
    useRecommendedImage,
    onUploadImage,
    removeImage,
    uploadImages,
    hasRequiredStyle,
    /** @deprecated kept for swap wizard typing */
    series: ip,
    setSeries: setIp,
    seriesOptions: ipOptions,
    seriesSlug: ipSlug,
    setSeriesSlug: setIpSlug,
  };
}
