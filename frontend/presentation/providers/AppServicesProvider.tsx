import React, { createContext, useContext, useMemo } from 'react';
import type { AppContainer } from '@/frontend/infrastructure/di/AppContainer';
import { getAppContainer } from '@/frontend/infrastructure/di/getAppContainer';

const AppServicesContext = createContext<AppContainer | null>(null);

export function AppServicesProvider({ children }: { children: React.ReactNode }) {
  const container = useMemo(() => getAppContainer(), []);
  return (
    <AppServicesContext.Provider value={container}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppContainer {
  const ctx = useContext(AppServicesContext);
  if (!ctx) {
    throw new Error('useAppServices must be used within AppServicesProvider');
  }
  return ctx;
}
