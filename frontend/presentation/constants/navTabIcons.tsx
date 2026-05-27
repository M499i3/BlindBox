import type React from 'react';
import HomeIcon from '@/frontend/presentation/components/HomeIcon';
import ExploreIcon from '@/frontend/presentation/components/ExploreIcon';
import MailIcon from '@/frontend/presentation/components/MailIcon';
import PersonIcon from '@/frontend/presentation/components/PersonIcon';
import MarketplaceIcon from '@/frontend/presentation/components/MarketplaceIcon';

export type NavTabKey = 'home' | 'explore' | 'shop' | 'mail' | 'profile';

export const NAV_TAB_ICONS: Record<
  NavTabKey,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  home: HomeIcon,
  explore: ExploreIcon,
  shop: MarketplaceIcon,
  mail: MailIcon,
  profile: PersonIcon,
};

const TITLE_TO_TAB: Record<string, NavTabKey> = {
  商城: 'shop',
  圖鑑: 'explore',
  消息: 'mail',
  個人檔案: 'profile',
  我的: 'profile',
};

/** 依路由或標題解析與底欄對應的 tab icon（首頁用 Logo，不顯示此 icon） */
export function resolveNavTabKey(pathname: string, title?: string): NavTabKey | null {
  if (pathname === '/shop' || pathname.startsWith('/shop/')) return 'shop';
  if (pathname === '/explore' || pathname.startsWith('/explore/')) return 'explore';
  if (pathname === '/chat' || pathname.startsWith('/chat/')) return 'mail';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';

  if (title && TITLE_TO_TAB[title]) return TITLE_TO_TAB[title];
  return null;
}
