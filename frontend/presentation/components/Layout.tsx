import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-[470px] mx-auto bg-[#f6f6f6] border-x border-black/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.06)]">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
