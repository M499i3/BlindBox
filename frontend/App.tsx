import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppShell from '@/frontend/presentation/components/AppShell';
import AppRouter from '@/frontend/presentation/router/AppRouter';

export default function App() {
  return (
    <Router>
      <AppShell>
        <AppRouter />
      </AppShell>
    </Router>
  );
}
