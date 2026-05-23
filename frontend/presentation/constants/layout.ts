/** 行動 App 外框寬度（與 Layout / TopBar / BottomNav 一致） */
export const APP_MAX_WIDTH = 470;

/** 底部導覽約略高度（供 FAB 定位） */
export const BOTTOM_NAV_OFFSET = '5rem';

/** TopBar logo 向上溢出（TOPBAR_LOGO − TOPBAR_HEIGHT） */
export const APP_SHELL_TOP_PADDING = 'pt-0.1';

export const APP_SHELL_CLASS = [
  'app-shell',
  'fixed top-0 bottom-0 left-1/2 z-0 h-dvh w-full max-w-[470px] -translate-x-1/2',
  'overflow-hidden bg-white doodle-frame',
  APP_SHELL_TOP_PADDING,
].join(' ');

/** 頁面根節點：避免子元素橫向溢出 */
export const APP_PAGE_CLASS = 'relative w-full min-w-0 max-w-full overflow-x-hidden';
