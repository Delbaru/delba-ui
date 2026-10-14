'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { createUrl } from '../core/base/url';

/** Reactive route helpers for client components, including their server render. */
export function useUrl() {
    const pathname = usePathname();
    return useMemo(() => createUrl(pathname), [pathname]);
}
