import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/frontend/shared/utils/cn';
import HomeIcon from '@/frontend/presentation/components/HomeIcon';
import ExploreIcon from '@/frontend/presentation/components/ExploreIcon';
import MailIcon from '@/frontend/presentation/components/MailIcon';
import PersonIcon from '@/frontend/presentation/components/PersonIcon';

type NavImageKey = 'home' | 'explore' | 'mail' | 'profile';

const NAV_IMAGE: Record<
  NavImageKey,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  home: HomeIcon,
  explore: ExploreIcon,
  mail: MailIcon,
  profile: PersonIcon,
};

const links: {
  to: string;
  label: string;
  navImage: NavImageKey;
  accentClass: string;
}[] = [
  { to: '/', label: '首頁', navImage: 'home', accentClass: 'nav-accent-0' },
  { to: '/explore', label: '探索', navImage: 'explore', accentClass: 'nav-accent-1' },
  { to: '/chat', label: '消息', navImage: 'mail', accentClass: 'nav-accent-2' },
  { to: '/profile', label: '我的', navImage: 'profile', accentClass: 'nav-accent-3' },
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
      <div className="relative z-10 flex justify-around items-center px-4 pb-1 pt-4.5">
      {links.map(({ to, label, navImage, accentClass }) => {
        const ImageIcon = NAV_IMAGE[navImage];

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1.5 w-11 px-1 py-0.5 transition-all duration-200 outline-none border-0 ring-0 shadow-none focus:outline-none focus-visible:outline-none',
                accentClass,
                isActive && 'is-active'
              )
            }
          >
            <span className="nav-image-icon flex items-center justify-center w-9 h-9 shrink-0 mx-auto overflow-hidden border-0 active:scale-95 transition-transform duration-200">
              <ImageIcon size={40} className="mx-auto scale-[1.12] border-0" />
            </span>
            <span className="nav-label block w-full text-center text-xs font-bold leading-none tracking-normal text-on-background">
              {label}
            </span>
          </NavLink>
        );
      })}
      </div>
    </nav>
  );
}
