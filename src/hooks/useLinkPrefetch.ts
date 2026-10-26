'use client';

import { useCallback, useState } from 'react';

export interface LinkPrefetchProps {
  /** Next Link: auto — штатная подготовка, true — полный маршрут заранее,
   * false — выключено, intent — полный маршрут после наведения или фокуса. */
  prefetch?: boolean | 'auto' | 'intent';
}

/** Owns only the intent gate. Scheduling, caching and deduplication stay with Next Link. */
export function useLinkPrefetch(mode: LinkPrefetchProps['prefetch'], href: string | undefined, enabled: boolean) {
  const [preparedHref, setPreparedHref] = useState<string | null>(null);
  const allowed = enabled && Boolean(href) && !href?.startsWith('#');
  const onIntent = useCallback(() => {
    if (allowed && mode === 'intent' && href) setPreparedHref(href);
  }, [allowed, mode, href]);
  return {
    prefetch: !allowed ? false : mode === 'intent' ? preparedHref === href : mode,
    onIntent,
  };
}
