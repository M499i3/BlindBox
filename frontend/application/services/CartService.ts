import type { Listing } from '@/frontend/domain/entities/listing';
import type { ICartRepository } from '@/frontend/domain/repositories/ICartRepository';
import type { ListingService } from '@/frontend/application/services/ListingService';

export class CartService {
  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly listingService: ListingService
  ) {}

  getCartListingIds(): string[] {
    return this.cartRepo.getListingIds();
  }

  isInCart(listingId: string): boolean {
    return this.cartRepo.getListingIds().includes(listingId);
  }

  async addToCart(listingId: string): Promise<void> {
    const ids = this.cartRepo.getListingIds();
    if (ids.includes(listingId)) return;
    await this.cartRepo.setListingIds([...ids, listingId]);
  }

  async removeFromCart(listingId: string): Promise<void> {
    await this.cartRepo.setListingIds(
      this.cartRepo.getListingIds().filter((id) => id !== listingId)
    );
  }

  getCartItems(): Listing[] {
    const ids = new Set(this.cartRepo.getListingIds());
    return this.listingService
      .getAllPosts()
      .filter((post) => ids.has(post.id));
  }

  getCartSubtotal(): number {
    return this.getCartItems().reduce((sum, item) => {
      const n = Number(item.price.replace(/[^\d.]/g, ''));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
}
