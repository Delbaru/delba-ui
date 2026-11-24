'use client';

import { useEffect, useState } from 'react';

/**
 * Подписка на медиазапрос. На сервере и до гидратации отдаёт `false` — разметка первого кадра
 * одинакова у сервера и клиента, а истинное значение приезжает в первом же эффекте.
 *
 * Строки запросов берутся из `MEDIA_QUERY`, а не пишутся на месте: ширина полосы должна
 * меняться в одном файле.
 */
export function useMediaQuery(query: string, enabled = true): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);

    sync();
    list.addEventListener('change', sync);

    return () => list.removeEventListener('change', sync);
  }, [query, enabled]);

  return enabled && matches;
}
