import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLogo from '@/frontend/presentation/components/AppLogo';
import CartIcon from '@/frontend/presentation/components/CartIcon';
import { TOPBAR_HEIGHT, TOPBAR_RIGHT_ICON_SIZE } from '@/frontend/presentation/constants/topbar';
import { NAV_TAB_ICONS, resolveNavTabKey } from '@/frontend/presentation/constants/navTabIcons';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { navigateBack } from '@/frontend/shared/utils/routeNavigation';

const TOPBAR_TITLE_ICON_SIZE = 36;

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function TopBar({ title, showBack, onBack, rightElement }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartIds } = useAppState();
  const isHomeLogo = !title && !showBack;
  const navTabKey = title ? resolveNavTabKey(location.pathname, title) : null;
  const TitleNavIcon = navTabKey ? NAV_TAB_ICONS[navTabKey] : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full min-w-0 overflow-x-hidden overflow-y-visible bg-white border-b-[2.5px] border-outline flex justify-between ${
        isHomeLogo ? 'items-end' : 'items-center'
      } px-4 py-0`}
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
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }
              navigateBack(navigate, location);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-outline bg-white shadow-[3px_3px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-accent-sky transition-all shrink-0"
            aria-label="返回"
          >
            <span className="material-symbols-outlined text-on-background">arrow_back</span>
          </button>
        )}

        {title ? (
          <div className="flex min-w-0 items-center gap-2">
            {TitleNavIcon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                <TitleNavIcon size={TOPBAR_TITLE_ICON_SIZE} className="scale-[1.08]" />
              </span>
            ) : null}
            <h1 className="truncate font-sans text-xl font-bold uppercase tracking-tight text-on-background">
              {title}
            </h1>
          </div>
        ) : (
          <AppLogo />
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rightElement ?? (
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="relative shrink-0 border-0 bg-transparent p-0 cursor-pointer transition-transform active:scale-95 hover:opacity-85"
            aria-label="購物車"
          >
            <CartIcon size={TOPBAR_RIGHT_ICON_SIZE} />
            {cartIds.length > 0 && (
              <span className="absolute top-0 right-0 min-w-5 h-5 px-1 rounded-full bg-secondary text-on-secondary border-2 border-outline text-[10px] font-bold flex items-center justify-center translate-x-1/4 -translate-y-1/4">
                {cartIds.length}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
