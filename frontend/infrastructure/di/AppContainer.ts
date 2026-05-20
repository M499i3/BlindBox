import { CatalogService } from '@/frontend/application/services/CatalogService';
import { ListingService } from '@/frontend/application/services/ListingService';
import { CartService } from '@/frontend/application/services/CartService';
import { ProfileService } from '@/frontend/application/services/ProfileService';
import { MarketplaceService } from '@/frontend/application/services/MarketplaceService';
import { getDataSourceMode } from '@/frontend/infrastructure/config/env';
import type { ICatalogRepository } from '@/frontend/domain/repositories/ICatalogRepository';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';
import type { ICartRepository } from '@/frontend/domain/repositories/ICartRepository';
import type { IProfileRepository } from '@/frontend/domain/repositories/IProfileRepository';
import { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';
import { LocalListingRepository } from '@/frontend/infrastructure/persistence/local/LocalListingRepository';
import { LocalCartRepository } from '@/frontend/infrastructure/persistence/local/LocalCartRepository';
import { LocalProfileRepository } from '@/frontend/infrastructure/persistence/local/LocalProfileRepository';
import { StaticCatalogRepository } from '@/frontend/infrastructure/persistence/static/StaticCatalogRepository';
import { SupabaseCatalogRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseCatalogRepository';
import { SupabaseListingRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseListingRepository';
import { SupabaseCartRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseCartRepository';
import { SupabaseProfileRepository } from '@/frontend/infrastructure/persistence/supabase/SupabaseProfileRepository';

export type AppContainer = {
  catalogRepo: ICatalogRepository;
  listingRepo: IListingRepository;
  cartRepo: ICartRepository;
  profileRepo: IProfileRepository;
  catalogService: CatalogService;
  listingService: ListingService;
  cartService: CartService;
  profileService: ProfileService;
  marketplaceService: MarketplaceService;
  bootstrapped: boolean;
};

export function createAppContainer(): AppContainer {
  const mode = getDataSourceMode();
  const useSupabase = mode === 'supabase';

  const catalogRepo = useSupabase
    ? new SupabaseCatalogRepository()
    : new StaticCatalogRepository();

  const catalogService = new CatalogService(catalogRepo);

  const localStore = new LocalStorageStore();
  const listingRepo = useSupabase
    ? new SupabaseListingRepository()
    : new LocalListingRepository(localStore);

  const cartRepo = useSupabase
    ? new SupabaseCartRepository()
    : new LocalCartRepository(localStore);

  const profileRepo = useSupabase
    ? new SupabaseProfileRepository()
    : new LocalProfileRepository(localStore);

  const listingService = new ListingService(listingRepo, catalogService);
  const cartService = new CartService(cartRepo, listingService);
  const profileService = new ProfileService(profileRepo);
  const marketplaceService = new MarketplaceService(
    catalogService,
    listingService
  );

  return {
    catalogRepo,
    listingRepo,
    cartRepo,
    profileRepo,
    catalogService,
    listingService,
    cartService,
    profileService,
    marketplaceService,
    bootstrapped: false,
  };
}
