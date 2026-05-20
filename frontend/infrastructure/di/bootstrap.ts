import type { AppContainer } from '@/frontend/infrastructure/di/AppContainer';
import { getDataSourceMode } from '@/frontend/infrastructure/config/env';

/** 初始化所有 Repository（Supabase 需先載入快取） */
export async function bootstrapAppContainer(
  container: AppContainer,
  options?: { force?: boolean }
): Promise<void> {
  if (container.bootstrapped && !options?.force) return;

  await container.catalogRepo.initialize();
  await container.listingRepo.initialize();
  await container.cartRepo.initialize();
  await container.profileRepo.initialize();

  container.bootstrapped = true;
}

export function needsAsyncBootstrap(): boolean {
  return getDataSourceMode() === 'supabase';
}
