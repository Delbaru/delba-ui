type LinkTarget = { href: string };

function routePath(href: string): string | null {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('#')) return null;
  return href.split('?')[0]?.replace(/\/+$/, '') || '/';
}

/** Чистый API маршрута: подходит SSR, не держит адрес запроса в общем состоянии. */
export function createUrl(pathname: string) {
  const current = pathname.replace(/\/+$/, '') || '/';
  const isCurrent = (href: string) => routePath(href) === current;
  const isActive = (href: string) => {
    const target = routePath(href);
    return target !== null && (target === current || (target !== '/' && current.startsWith(`${target}/`)));
  };
  return {
    current: () => current,
    isCurrent,
    isActive,
    anyActive: (links: readonly LinkTarget[]) => links.some((link) => isActive(link.href)),
    props: (href: string) => ({ state: isActive(href) ? 'current' : undefined, 'aria-current': isCurrent(href) ? 'page' as const : undefined }),
  };
}

/** Браузерный сервис читает живой location. Для реактивной разметки нужен адаптер маршрутизатора. */
export function createBrowserUrl(browser: Window) {
  return {
    current: () => createUrl(browser.location.pathname).current(),
    href: () => browser.location.href,
    hash: () => browser.location.hash,
    query: (key: string) => new URLSearchParams(browser.location.search).get(key),
    isCurrent: (href: string) => createUrl(browser.location.pathname).isCurrent(href),
    isActive: (href: string) => createUrl(browser.location.pathname).isActive(href),
    anyActive: (links: readonly LinkTarget[]) => createUrl(browser.location.pathname).anyActive(links),
    props: (href: string) => createUrl(browser.location.pathname).props(href),
  };
}

export type BrowserUrl = ReturnType<typeof createBrowserUrl>;

declare global {
  // Сервис устанавливает приложение только в браузере. SSR использует createUrl(pathname).
  var url: BrowserUrl;
}

/** Установить url.current()/query()/hash() без импортов в браузерных обработчиках. */
export function installBrowserUrl(browser: Window): BrowserUrl {
  const service = createBrowserUrl(browser);
  Object.defineProperty(browser, 'url', { value: service, configurable: true, writable: false });
  return service;
}
