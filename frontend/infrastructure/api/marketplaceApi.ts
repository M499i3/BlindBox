import { apiFetch } from './apiClient';

export type MarketplaceRankingItem = {
  id: string;
  rank: string;
  title: string;
  price: string;
  image: string;
  is_hot: boolean;
};

export function getTrendingTags(): Promise<string[]> {
  return apiFetch<string[]>('/api/marketplace/trending-tags');
}

export function getRankings(): Promise<MarketplaceRankingItem[]> {
  return apiFetch<MarketplaceRankingItem[]>('/api/marketplace/rankings');
}
