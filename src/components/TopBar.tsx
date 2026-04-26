import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function TopBar({ title, showBack, rightElement }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant flex justify-between items-center px-5 py-3 h-16">
      <div className="flex items-center gap-4">
        {showBack && (
          <button 
            onClick={() => navigate(-1)}
            className="text-on-background active:scale-95 duration-200 cursor-pointer opacity-95 hover:opacity-100"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {title ? (
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#0047ab]">{title}</h1>
        ) : (
          <div className="text-2xl font-extrabold tracking-tight text-[#0047ab]">
            Blindy
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {rightElement || (
          <>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="hover:opacity-90 transition-opacity active:scale-95 duration-200 text-on-background"
              aria-label="搜尋"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
