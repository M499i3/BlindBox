import { useState } from 'react';
import { uploadImageToStorage } from '@/frontend/infrastructure/storage/supabaseStorage';
import { useCatalogProductPicker } from '@/frontend/presentation/hooks/useCatalogProductPicker';

export type { CatalogStyleOption } from '@/frontend/presentation/hooks/useCatalogProductPicker';

export function useCatalogListingForm() {
  const picker = useCatalogProductPicker();
  const [images, setImages] = useState<string[]>([]);
  const [localImageFiles, setLocalImageFiles] = useState<(File | null)[]>([]);
  const [recommendedImage, setRecommendedImage] = useState('');
  const [title, setTitle] = useState('');

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
    const style = picker.styleOptions.find((s) => s.id === styleId);
    if (!style) return;
    picker.applyCatalogStyle(styleId);
    if (!title.trim()) setTitle(`想換 ${style.name}`);
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

  return {
    images,
    title,
    setTitle,
    itemName: picker.itemName,
    setItemName: picker.setItemName,
    catalogProductId: picker.catalogProductId,
    brand: picker.brand,
    setBrand: picker.setBrand,
    brandSlug: picker.brandSlug,
    setBrandSlug: picker.setBrandSlug,
    brandOptions: picker.brandOptions,
    ip: picker.ip,
    setIp: picker.setIp,
    ipSlug: picker.ipSlug,
    setIpSlug: picker.setIpSlug,
    ipOptions: picker.ipOptions,
    productLine: picker.productLine,
    setProductLine: picker.setProductLine,
    productLineOptions: picker.productLineOptions,
    styleOptions: picker.styleOptions,
    productsLoading: picker.productsLoading,
    recommendedImage,
    applyCatalogStyle,
    useRecommendedImage,
    onUploadImage,
    removeImage,
    uploadImages,
    hasRequiredStyle: picker.hasRequiredStyle,
    series: picker.ip,
    setSeries: picker.setIp,
    seriesOptions: picker.ipOptions,
    seriesSlug: picker.ipSlug,
    setSeriesSlug: picker.setIpSlug,
  };
}
