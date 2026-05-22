import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <main className="app-scroll min-h-0 flex-1 overflow-y-auto bg-white no-scrollbar pb-2">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
