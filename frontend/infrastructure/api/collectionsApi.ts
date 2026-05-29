import { apiFetch } from './apiClient';

export type UserCollections = {
  collected: string[];
  wishlist: string[];
};

type ApiCollections = {
  collected: string[];
  wishlist: string[];
};

export async function getCollections(): Promise<UserCollections> {
  return apiFetch<ApiCollections>('/api/collections');
}

export async function addCollectionItem(
  productId: string,
  type: 'collected' | 'wishlist'
): Promise<UserCollections> {
  return apiFetch<UserCollections>('/api/collections/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, type }),
  });
}

export async function removeCollectionItem(
  productId: string,
  type: 'collected' | 'wishlist'
): Promise<UserCollections> {
  return apiFetch<UserCollections>(
    `/api/collections/items/${encodeURIComponent(productId)}?type=${type}`,
    { method: 'DELETE' }
  );
}
