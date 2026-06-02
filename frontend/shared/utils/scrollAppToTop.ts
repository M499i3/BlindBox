export function getAppScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-scroll');
}

export function scrollAppToTop(behavior: ScrollBehavior = 'auto'): void {
  getAppScrollEl()?.scrollTo({ top: 0, behavior });
}
