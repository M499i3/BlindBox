import React from 'react';
import { APP_SHELL_CLASS } from '@/frontend/presentation/constants/layout';

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return <div className={APP_SHELL_CLASS}>{children}</div>;
}
