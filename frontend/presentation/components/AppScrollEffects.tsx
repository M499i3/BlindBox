import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollAppToTop } from '@/frontend/shared/utils/scrollAppToTop';
import { trackPageNavigation } from '@/frontend/shared/utils/routeNavigation';

/** 路由切換時將主捲動區捲回最上方（同頁操作如收藏、篩選不觸發） */
export default function AppScrollEffects() {
  const location = useLocation();

  useEffect(() => {
    trackPageNavigation(location);
    scrollAppToTop();
  }, [location.pathname]);

  return null;
}
