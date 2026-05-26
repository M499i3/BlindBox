import React from 'react';
import { Outlet } from 'react-router-dom';

/** 無底部導覽的頁面：在 App 殼層內捲動，不顯示捲軸 */
export default function ScrollLayout() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto bg-white no-scrollbar">
        <Outlet />
      </div>
    </div>
  );
}
