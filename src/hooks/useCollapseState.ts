'use client';

import { useState } from 'react';

export interface CollapseStateOptions {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

/** Один владелец целевого состояния, в том числе у компонентов с отдельной портальной панелью. */
export function useCollapseState(options: CollapseStateOptions) {
    const [internalOpen, setInternalOpen] = useState(options.defaultOpen ?? false);
    const open = options.open ?? internalOpen;

    function changeOpen(next: boolean) {
        if (options.open === undefined) setInternalOpen(next);
        options.onOpenChange?.(next);
    }

    return { open, changeOpen };
}
