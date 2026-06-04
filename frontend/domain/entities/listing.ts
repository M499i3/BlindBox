/** 市集貼文（使用者上架或種子資料） */
export type Listing = {
  id: string;
  title: string;
  itemName: string;
  price: string;
  description: string;
  brand: string;
  ip?: string;
  series: string;
  catalogProductId?: string;
  condition: string;
  tradeMode: string;
  shipping: string;
  shippingMethods?: string[];
  allowSwap: boolean;
  allowBargain: boolean;
  quantity: number; 
  image: string;
  images?: string[];
  createdAt: string;
  sellerId?: string;
  sellerName: string;
  splitBoxGroupId?: string | null;
  splitBoxSlotId?: string | null;
  isSeeded?: boolean;
};

export type CreateListingInput = Omit<
  Listing,
  'id' | 'createdAt' | 'sellerName' | 'isSeeded'
> & {
  ip?: string;
  /** 圖鑑 external_id 或 UUID */
  catalogProductId?: string;
};
