import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppServicesProvider } from '@/frontend/presentation/providers/AppServicesProvider';
import { AppStateProvider } from '@/frontend/presentation/providers/AppStateProvider';
import { AuthProvider } from '@/frontend/presentation/providers/AuthProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppServicesProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </AppServicesProvider>
    </AuthProvider>
  </StrictMode>
);
