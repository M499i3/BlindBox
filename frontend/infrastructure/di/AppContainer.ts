import { CatalogService } from '@/frontend/application/services/CatalogService';
import { ListingService } from '@/frontend/application/services/ListingService';
import { CartService } from '@/frontend/application/services/CartService';
import { ProfileService } from '@/frontend/application/services/ProfileService';
import { MarketplaceService } from '@/frontend/application/services/MarketplaceService';
import { getDataSourceMode } from '@/frontend/infrastructure/config/env';
import { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';
import { LocalListingRepository } from '@/frontend/infrastructure/persistence/local/LocalListingRepository';
import { LocalCartRepository } from '@/frontend/infrastructure/persistence/local/LocalCartRepository';
import { LocalProfileRepository } from '@/frontend/infrastructure/persistence/local/LocalProfileRepository';
import { StaticCatalogRepository } from '@/frontend/infrastructure/persistence/static/StaticCatalogRepository';
import { SupabaseCatalogRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseCatalogRepository';
import { SupabaseListingRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseListingRepository';

export type AppContainer = {
  catalogService: CatalogService;
  listingService: ListingService;
  cartService: CartService;
  profileService: ProfileService;
  marketplaceService: MarketplaceService;
};

export function createAppContainer(): AppContainer {
  const mode = getDataSourceMode();

  const catalogRepo =
    mode === 'supabase'
      ? new SupabaseCatalogRepository()
      : new StaticCatalogRepository();

  const catalogService = new CatalogService(catalogRepo);

  const localStore = new LocalStorageStore();
  const listingRepo =
    mode === 'supabase'
      ? new SupabaseListingRepository()
      : new LocalListingRepository(localStore);

  const cartRepo = new LocalCartRepository(localStore);
  const profileRepo = new LocalProfileRepository(localStore);

  const listingService = new ListingService(listingRepo, catalogService);
  const cartService = new CartService(cartRepo, listingService);
  const profileService = new ProfileService(profileRepo);
  const marketplaceService = new MarketplaceService(
    catalogService,
    listingService
  );

  return {
    catalogService,
    listingService,
    cartService,
    profileService,
    marketplaceService,
  };
}
