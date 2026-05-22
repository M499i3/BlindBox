import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, Mail, UserRound } from 'lucide-react';
import { cn } from '@/frontend/shared/utils/cn';

const links: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { to: '/', label: '首頁', Icon: Home },
  { to: '/explore', label: '探索', Icon: Compass },
  { to: '/chat', label: '消息', Icon: Mail },
  { to: '/profile', label: '我的', Icon: UserRound },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] z-50 bg-background/80 backdrop-blur-xl border-t border-outline-variant flex justify-around items-center px-4 pb-7 pt-3 shadow-[0_-18px_44px_rgba(25,27,34,0.10)]">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 min-w-[56px]',
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-background'
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
