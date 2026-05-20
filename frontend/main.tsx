import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppServicesProvider } from '@/frontend/presentation/providers/AppServicesProvider';
import { AppStateProvider } from '@/frontend/presentation/providers/AppStateProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppServicesProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </AppServicesProvider>
  </StrictMode>
);
