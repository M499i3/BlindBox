import { useEffect, useMemo, useState } from 'react';
import { getCatalogBrands, getCatalogSeries, getCatalogStyles } from '@/frontend/infrastructure/api/catalogApi';
import { fetchCached } from '@/frontend/shared/utils/fetchCache';
import {
  CATALOG_BRANDS_KEY,
  catalogSeriesKey,
  catalogStylesKey,
} from '@/frontend/shared/utils/catalogCacheKeys';
import { uploadImageToStorage } from '@/frontend/infrastructure/storage/supabaseStorage';
import type { BrandRow, SeriesRow, StyleRow } from '@/frontend/domain/entities/catalog';

export function useCatalogListingForm() {
  const [images, setImages] = useState<string[]>([]);
  const [localImageFiles, setLocalImageFiles] = useState<(File | null)[]>([]);
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [brandOptions, setBrandOptions] = useState<BrandRow[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesRow[]>([]);
  const [seriesSlug, setSeriesSlug] = useState('');
  const [styleOptions, setStyleOptions] = useState<StyleRow[]>([]);
  const [query, setQuery] = useState('');

  const filteredStyles = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = styleOptions;
    if (itemName.trim()) {
      pool = pool.filter((style) => style.name === itemName.trim());
    }
    if (!q) return pool.slice(0, 8);
    return pool.filter((style) => style.name.toLowerCase().includes(q)).slice(0, 8);
  }, [styleOptions, query, itemName]);

  useEffect(() => {
    fetchCached(CATALOG_BRANDS_KEY, getCatalogBrands)
      .then((rows) => {
        if (!rows.length) return;
        setBrandOptions(rows);
        const first = rows[0];
        const firstSlug = first.slug ?? first.name.toLowerCase().replace(/\s+/g, '-');
        setBrand(first.name);
        setBrandSlug(firstSlug);
      })
      .catch(() => {
        const fallback = [
          { name: 'POPMART 泡泡瑪特', slug: 'popmart', image: '' },
          { name: '52TOYS', slug: '52toys', image: '' },
          { name: 'Finding Unicorn', slug: 'finding-unicorn', image: '' },
        ];
        setBrandOptions(fallback);
        setBrand(fallback[0].name);
        setBrandSlug(fallback[0].slug);
      });
  }, []);

  useEffect(() => {
    if (!brandSlug) return;
    fetchCached(catalogSeriesKey(brandSlug), () => getCatalogSeries(brandSlug))
      .then((rows) => {
        setSeriesOptions(rows);
        const first = rows[0];
        setSeries(first?.name ?? '');
        setSeriesSlug(first?.slug ?? '');
        setItemName('');
      })
      .catch(() => {
        setSeriesOptions([]);
        setSeries('');
        setSeriesSlug('');
        setItemName('');
      });
  }, [brandSlug]);

  useEffect(() => {
    if (!brandSlug || !seriesSlug) {
      setStyleOptions([]);
      return;
    }
    fetchCached(catalogStylesKey(brandSlug, seriesSlug), () =>
      getCatalogStyles(brandSlug, seriesSlug)
    )
      .then((rows) => setStyleOptions(rows))
      .catch(() => setStyleOptions([]));
  }, [brandSlug, seriesSlug]);

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

  const applyCatalogStyle = (style: StyleRow) => {
    if (style.image) setImages([style.image]);
    setLocalImageFiles([]);
    setItemName(style.name);
    if (!title) setTitle(style.name);
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

  return {
    images,
    title,
    setTitle,
    itemName,
    setItemName,
    brand,
    setBrand,
    series,
    setSeries,
    brandSlug,
    setBrandSlug,
    brandOptions,
    seriesOptions,
    seriesSlug,
    setSeriesSlug,
    styleOptions,
    query,
    setQuery,
    filteredStyles,
    onUploadImage,
    removeImage,
    applyCatalogStyle,
    uploadImages,
  };
}
