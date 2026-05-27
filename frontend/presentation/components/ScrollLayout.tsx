import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '@/frontend/presentation/components/BottomNav';

/** ScrollLayout：細節頁同樣顯示底欄 */
export default function ScrollLayout() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto bg-white no-scrollbar pb-2">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
