import React from 'react';
import { NavLink } from 'react-router-dom';
import { Grid3X3, Home, MessageCircle, UserRound } from 'lucide-react';
import { cn } from '@/frontend/shared/utils/cn';

const links: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { to: '/', label: '首頁', Icon: Home },
  { to: '/explore', label: '圖鑑', Icon: Grid3X3 },
  { to: '/chat', label: '聊聊', Icon: MessageCircle },
  { to: '/profile', label: '我的', Icon: UserRound },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] z-50 bg-[#f6f6f6]/95 backdrop-blur-md border-t border-black/[0.08] flex justify-around items-center px-4 pb-7 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 min-w-[56px]',
              isActive ? 'text-black' : 'text-[#7b7b7b] hover:text-black'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className="size-[22px] shrink-0"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span className="text-[11px] font-semibold leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
