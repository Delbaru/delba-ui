'use client';

import { useEffect } from 'react';
import { observeScrollbarActivity } from '../../core/scrollbar-activity';

/** Enable activity for plain scrollbarProps viewports (including html/body) without another DOM wrapper. */
export function ScrollbarActivity() {
    useScrollbarActivity();
    return null;
}

/** ScrollArea and Modal share the same document observer; refs and consumer DOM handlers remain untouched. */
export function useScrollbarActivity(): void {
    useEffect(() => observeScrollbarActivity(document), []);
}
