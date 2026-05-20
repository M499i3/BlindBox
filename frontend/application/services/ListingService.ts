import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';
import type { CatalogService } from '@/frontend/application/services/CatalogService';

const DEFAULT_SELLER_NAME = 'Yu';

export class ListingService {
  constructor(
    private readonly listingRepo: IListingRepository,
    private readonly catalogService: CatalogService
  ) {}

  getUserListings(): Listing[] {
    return this.listingRepo.findUserListings();
  }

  getSeededListings(): Listing[] {
    return this.catalogService.getShowcase().products.map((p, idx) => ({
      id: `pm_${p.id}`,
      title: p.title,
      itemName: p.title,
      price: p.price || 'HK$ 0.00',
      description: '來自官方圖鑑資料的示意貼文（可直接查看詳情）。',
      brand: 'Pop Mart',
      series: 'Official',
      condition: idx % 2 === 0 ? '全新未拆' : '已拆盒',
      tradeMode: idx % 3 === 0 ? '我想換' : '我要賣',
      shipping: '7-11 店到店',
      allowSwap: true,
      allowBargain: idx % 2 === 0,
      image: p.image,
      createdAt: new Date().toISOString(),
      sellerName: `Seller_${(idx % 8) + 1}`,
      isSeeded: true,
    }));
  }

  getAllPosts(): Listing[] {
    return [...this.getUserListings(), ...this.getSeededListings()];
  }

  getPostById(id: string): Listing | undefined {
    return this.getAllPosts().find((p) => p.id === id);
  }

  createListing(
    input: CreateListingInput,
    sellerName: string = DEFAULT_SELLER_NAME
  ): Listing {
    return this.listingRepo.create(input, sellerName);
  }
}
