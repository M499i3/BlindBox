import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/frontend/shared/utils/cn';
import { NAV_TAB_ICONS, type NavTabKey } from '@/frontend/presentation/constants/navTabIcons';

const links: {
  to: string;
  label: string;
  navImage: NavTabKey;
  accentClass: string;
}[] = [
  { to: '/', label: '首頁', navImage: 'home', accentClass: 'nav-accent-0' },
  { to: '/explore', label: '圖鑑', navImage: 'explore', accentClass: 'nav-tab-plain' },
  { to: '/chat', label: '消息', navImage: 'mail', accentClass: 'nav-accent-3' },
  { to: '/profile', label: '我的', navImage: 'profile', accentClass: 'nav-accent-4' },
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-50 w-full min-w-0 shrink-0 overflow-visible bg-white">
      <img
        src="/nav-banner-line-only.svg?v=1"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-14 h-20 w-[300%] max-w-none -translate-x-1/2 origin-bottom scale-[3.4] object-contain object-bottom mix-blend-multiply"
        decoding="async"
      />
      <div className="relative z-10 flex justify-around items-center px-2 pb-1 pt-4.5">
      {links.map(({ to, label, navImage, accentClass }) => {
        const ImageIcon = NAV_TAB_ICONS[navImage];

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 w-10 min-w-0 px-0.5 py-0.5 transition-opacity duration-200 outline-none border-0 ring-0 shadow-none focus:outline-none focus-visible:outline-none',
                accentClass,
                isActive ? 'opacity-100 is-active' : 'opacity-55'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="nav-image-icon flex items-center justify-center w-9 h-9 shrink-0 mx-auto overflow-visible border-0">
                  <ImageIcon size={40} className="mx-auto scale-[1.12] border-0" />
                </span>
                <span
                  className={cn(
                    'nav-label block w-full text-center text-xs font-bold leading-none tracking-normal transition-colors duration-200',
                    isActive ? 'text-accent-amber' : 'text-on-background'
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
      </div>
    </nav>
  );
}
