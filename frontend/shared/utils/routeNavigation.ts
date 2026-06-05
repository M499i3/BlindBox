import type { Location, NavigateFunction } from 'react-router-dom';

export type RouteLocationState = {
  from?: string;
};

const PAGE_STACK_KEY = 'app:pageStack';

function readPageStack(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(PAGE_STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function writePageStack(stack: string[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PAGE_STACK_KEY, JSON.stringify(stack));
}

/** 路由 pathname 變更時更新頁面堆疊（同頁 query/tab 不新增一層） */
export function trackPageNavigation(location: Location): void {
  const pathname = location.pathname;
  const stack = readPageStack();
  const existingIdx = stack.lastIndexOf(pathname);

  if (existingIdx >= 0) {
    writePageStack(stack.slice(0, existingIdx + 1));
    return;
  }

  writePageStack([...stack, pathname]);
}

/** 目前頁面完整路徑（含 query），作為返回目標 */
export function currentReturnPath(location: Location): string {
  return location.pathname + location.search;
}

export function readReturnPath(location: Location): string | undefined {
  return (location.state as RouteLocationState | null)?.from;
}

/** TopBar／錯誤頁返回：優先 state.from，其次上一個不同 pathname，最後 history -1 或首頁 */
export function navigateBack(navigate: NavigateFunction, location: Location): void {
  const from = readReturnPath(location);
  if (from) {
    navigate(from);
    return;
  }

  const pathname = location.pathname;
  const stack = readPageStack();
  const idx = stack.lastIndexOf(pathname);
  if (idx > 0) {
    navigate(stack[idx - 1]!);
    return;
  }

  if (typeof window !== 'undefined' && window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate('/');
}

/** 前往下一頁並記住來源，供返回還原篩選／tab／捲動情境 */
export function navigateWithReturn(
  navigate: NavigateFunction,
  to: string,
  fromLocation: Location,
  options?: { replace?: boolean; from?: string }
): void {
  const from = options?.from ?? currentReturnPath(fromLocation);
  navigate(to, {
    replace: options?.replace,
    state: { from } satisfies RouteLocationState,
  });
}
