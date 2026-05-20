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
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] z-50 bg-[#f6f6f6]/95 backdrop-blur-md border-b border-black/[0.08] flex justify-between items-center px-5 py-3 h-16">
      <div className="flex items-center gap-4">
        {showBack && (
          <button 
            onClick={() => navigate(-1)}
            className="text-black active:scale-95 duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {title ? (
          <h1 className="font-sans text-2xl font-black tracking-tight text-black">{title}</h1>
        ) : (
          <div className="text-2xl font-black text-black">
            TRADE
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {rightElement || (
          <>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="hover:opacity-80 transition-opacity active:scale-95 duration-200 text-black"
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
