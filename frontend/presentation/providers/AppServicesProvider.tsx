import React from 'react';

/**
 * AppServicesProvider — 重構後僅作為佔位層，DI 容器已移除。
 * 所有資料存取由 AppStateProvider 透過 FastAPI 後端完成。
 */
export function AppServicesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
