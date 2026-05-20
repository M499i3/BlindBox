import {
  createAppContainer,
  type AppContainer,
} from '@/frontend/infrastructure/di/AppContainer';
import { bootstrapAppContainer } from '@/frontend/infrastructure/di/bootstrap';

let singleton: AppContainer | null = null;
let bootstrapPromise: Promise<AppContainer> | null = null;

/** 應用程式級 DI 單例（前端與測試共用同一組 Service） */
export function getAppContainer(): AppContainer {
  if (!singleton) singleton = createAppContainer();
  return singleton;
}

/** 建立並初始化 Repository（Supabase 模式必須 await） */
export async function getAppContainerAsync(): Promise<AppContainer> {
  const container = getAppContainer();
  if (container.bootstrapped) return container;

  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapAppContainer(container).then(() => container);
  }
  return bootstrapPromise;
}

/** 測試用：重置容器 */
export function resetAppContainer(): void {
  singleton = null;
  bootstrapPromise = null;
}

/** Vite HMR 時清掉快取，避免仍顯示舊的圖鑑資料 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    resetAppContainer();
  });
}
