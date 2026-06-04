import type { Location, NavigateFunction } from 'react-router-dom';

export type RouteLocationState = {
  from?: string;
};

/** 目前頁面完整路徑（含 query），作為返回目標 */
export function currentReturnPath(location: Location): string {
  return location.pathname + location.search;
}

export function readReturnPath(location: Location): string | undefined {
  return (location.state as RouteLocationState | null)?.from;
}

/** TopBar／錯誤頁返回：優先 state.from，其次 history -1，最後回首頁 */
export function navigateBack(navigate: NavigateFunction, location: Location): void {
  const from = readReturnPath(location);
  if (from) {
    navigate(from);
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
