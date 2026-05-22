import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from '@/frontend/presentation/router/AppRouter';

export default function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}
