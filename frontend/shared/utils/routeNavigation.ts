import type { Location, NavigateFunction } from 'react-router-dom';

export type RouteLocationState = {
  from?: string;
};

const PAGE_STACK_KEY = 'app:pageStack:v2';

/** 堆疊與返回目標須含 query（如 /subseries?brand=&series=），僅 pathname 會丟失系列篩選 */
function pageStackKey(location: Location): string {
  return location.pathname + location.search;
}

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

/** 路由變更時更新頁面堆疊（同 pathname+search 視為同一層） */
export function trackPageNavigation(location: Location): void {
  const key = pageStackKey(location);
  const stack = readPageStack();
  const existingIdx = stack.lastIndexOf(key);

  if (existingIdx >= 0) {
    writePageStack(stack.slice(0, existingIdx + 1));
    return;
  }

  writePageStack([...stack, key]);
}

/** 目前頁面完整路徑（含 query），作為返回目標 */
export function currentReturnPath(location: Location): string {
  return location.pathname + location.search;
}

export function readReturnPath(location: Location): string | undefined {
  return (location.state as RouteLocationState | null)?.from;
}

/** TopBar／錯誤頁返回：優先 state.from，其次堆疊上一頁（含 query），最後 history -1 或首頁 */
export function navigateBack(navigate: NavigateFunction, location: Location): void {
  const from = readReturnPath(location);
  const current = pageStackKey(location);
  if (from && from !== current) {
    navigate(from);
    return;
  }

  const key = pageStackKey(location);
  const stack = readPageStack();
  let idx = stack.lastIndexOf(key);
  if (idx < 0) {
    idx = stack.lastIndexOf(location.pathname);
  }
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
