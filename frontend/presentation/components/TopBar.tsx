import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLogo from '@/frontend/presentation/components/AppLogo';
import { TOPBAR_HEIGHT } from '@/frontend/presentation/constants/topbar';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function TopBar({ title, showBack, rightElement }: TopBarProps) {
  const navigate = useNavigate();
  const isHomeLogo = !title && !showBack;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full min-w-0 overflow-x-hidden overflow-y-visible bg-white border-b-[2.5px] border-outline flex justify-between items-end px-4 py-0"
      style={{ height: TOPBAR_HEIGHT }}
    >
      <div
        className={
          isHomeLogo
            ? 'flex min-w-0 self-stretch overflow-visible'
            : 'flex items-center gap-3 min-w-0'
        }
      >
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-outline bg-white shadow-[2px_2px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-accent-sky transition-all shrink-0"
            aria-label="??"
          >
            <span className="material-symbols-outlined text-on-background">arrow_back</span>
          </button>
        )}
        {title ? (
          <h1 className="font-sans text-xl font-bold tracking-tight text-on-background uppercase truncate">
            {title}
          </h1>
        ) : (
          <AppLogo />
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rightElement || (
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-outline bg-white shadow-[2px_2px_0_#111] hover:bg-accent-amber active:bg-accent-coral active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="??"
          >
            <span className="material-symbols-outlined text-on-background">search</span>
          </button>
        )}
      </div>
    </header>
  );
}
