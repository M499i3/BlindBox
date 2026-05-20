import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import type { CatalogService } from '@/frontend/application/services/CatalogService';
import type { ListingService } from '@/frontend/application/services/ListingService';

export type MarketplaceRankingItem = {
  id: string;
  rank: string;
  title: string;
  price: string;
  image: string;
  isHot: boolean;
};

export type MarketplaceRecommendation = {
  id: string;
  title: string;
  price: string;
  type: string;
  image: string;
};

export class MarketplaceService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly listingService: ListingService
  ) {}

  getHeroImage(): string {
    const { banners, products } = this.catalogService.getShowcase();
    return (
      banners[0]?.image ??
      products[0]?.image ??
      this.catalogService.getDefaultProductImage()
    );
  }

  getTrendingTags(limit = 6): string[] {
    const products = this.catalogService.getShowcase().products.slice(0, 20);
    const tags = [
      ...new Set(
        products.map((p) => this.catalogService.deriveBrandLabel(p.title))
      ),
    ].slice(0, limit);
    return tags.length > 0 ? tags : ['Pop Mart', 'Dimoo', 'Labubu', '隱藏款'];
  }

  getRankingItems(count = 4): MarketplaceRankingItem[] {
    return this.catalogService
      .getShowcase()
      .products.slice(0, count)
      .map((p, i) => ({
        id: p.id,
        rank: String(i + 1).padStart(2, '0'),
        title: p.title,
        price: p.price,
        image: p.image,
        isHot: i < 2,
      }));
  }

  getNewReleases(start = 4, count = 3): Pick<CatalogProduct, 'id' | 'title' | 'image'>[] {
    return this.catalogService
      .getShowcase()
      .products.slice(start, start + count)
      .map((p) => ({ id: p.id, title: p.title, image: p.image }));
  }

  getRecommendations(limit = 12): MarketplaceRecommendation[] {
    return this.listingService.getAllPosts().slice(0, limit).map((p, i) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      type: p.tradeMode || (i % 2 === 0 ? '可交換' : '可購買'),
      image: p.image,
    }));
  }

  getLatestUserListings(limit = 8): Listing[] {
    return this.listingService.getUserListings().slice(0, limit);
  }
}
