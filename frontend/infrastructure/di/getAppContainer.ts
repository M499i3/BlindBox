import {
  createAppContainer,
  type AppContainer,
} from '@/frontend/infrastructure/di/AppContainer';

let singleton: AppContainer | null = null;

/** 應用程式級 DI 單例（前端與測試共用同一組 Service） */
export function getAppContainer(): AppContainer {
  if (!singleton) singleton = createAppContainer();
  return singleton;
}

/** 測試用：重置容器 */
export function resetAppContainer(): void {
  singleton = null;
}
