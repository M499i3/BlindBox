/** 單一盲盒「想要」通知條件 */
export type WishAlertSettings = {
  /** 市集此前無人上架過，首次有人上架時通知 */
  newListingNotify: boolean;
  priceDropEnabled: boolean;
  /** 低於此金額（HKD）時通知；null 表示未設定 */
  priceDropMax: number | null;
  unboxNotify: boolean;
  exchangeNotify: boolean;
};

export function createDefaultWishAlertSettings(lowestMarketPrice: number | null): WishAlertSettings {
  return {
    newListingNotify: true,
    priceDropEnabled: true,
    priceDropMax: lowestMarketPrice,
    unboxNotify: true,
    exchangeNotify: true,
  };
}

/** 合併舊版 localStorage 設定，補上缺少欄位的預設值 */
export function normalizeWishAlertSettings(
  saved: Partial<WishAlertSettings> | undefined,
  lowestMarketPrice: number | null
): WishAlertSettings {
  const defaults = createDefaultWishAlertSettings(lowestMarketPrice);
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    newListingNotify: saved.newListingNotify ?? defaults.newListingNotify,
  };
}
