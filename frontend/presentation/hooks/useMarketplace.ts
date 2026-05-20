import { useMemo } from 'react';
import { useAppServices } from '@/frontend/presentation/providers/AppServicesProvider';

export function useMarketplace() {
  const { marketplaceService } = useAppServices();

  return useMemo(
    () => ({
      getHeroImage: () => marketplaceService.getHeroImage(),
      getTrendingTags: () => marketplaceService.getTrendingTags(),
      getRankingItems: () => marketplaceService.getRankingItems(),
      getNewReleases: () => marketplaceService.getNewReleases(),
      getRecommendations: () => marketplaceService.getRecommendations(),
      getLatestUserListings: () => marketplaceService.getLatestUserListings(),
    }),
    [marketplaceService]
  );
}
