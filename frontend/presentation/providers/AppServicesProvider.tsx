import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppContainer } from '@/frontend/infrastructure/di/AppContainer';
import {
  getAppContainer,
  getAppContainerAsync,
} from '@/frontend/infrastructure/di/getAppContainer';
import { needsAsyncBootstrap } from '@/frontend/infrastructure/di/bootstrap';
import { getDataSourceMode } from '@/frontend/infrastructure/config/env';

const AppServicesContext = createContext<AppContainer | null>(null);

function BootstrapScreen({
  message,
  isError,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center px-6 ${
        isError ? 'text-red-600' : 'text-slate-600'
      }`}
    >
      <p className="text-sm font-medium text-center max-w-md">{message}</p>
    </div>
  );
}

export function AppServicesProvider({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<AppContainer | null>(() =>
    needsAsyncBootstrap() ? null : getAppContainer()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!needsAsyncBootstrap()) return;

    let cancelled = false;
    getAppContainerAsync()
      .then((c) => {
        if (!cancelled) setContainer(c);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '無法連線 Supabase 資料層'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => container, [container]);

  if (needsAsyncBootstrap() && !value && !error) {
    return <BootstrapScreen message="正在連線資料庫…" />;
  }

  if (error || (needsAsyncBootstrap() && !value)) {
    return (
      <BootstrapScreen
        message={error ?? '資料層初始化失敗'}
        isError
      />
    );
  }

  if (!value) return null;

  if (import.meta.env.DEV) {
    const meta = value.catalogService.getLoadMeta();
    if (meta.kind === 'supabase') {
      console.info(
        `[BlindBox] 圖鑑：資料庫 catalog_products（${meta.count} 筆）` +
          `；範例 ${meta.sampleExternalId}「${meta.sampleTitle}」` +
          ' — 改 DB 後請硬重新整理（Cmd+Shift+R）'
      );
    } else {
      console.warn(
        `[BlindBox] 圖鑑：靜態 JSON（${meta.count} 筆，原因：${meta.reason}` +
          `${meta.detail ? ` / ${meta.detail}` : ''}）` +
          ' — 你在 Table Editor 的修改不會顯示'
      );
    }
    console.info(`[BlindBox] VITE_DATA_SOURCE=${getDataSourceMode()}`);
  }

  return (
    <AppServicesContext.Provider value={value}>
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
