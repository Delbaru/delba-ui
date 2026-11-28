'use client';

import { createContext, useContext, type ReactNode } from 'react';

const TooltipPolicy = createContext(false);

/** Scoped labels opt in to the surrounding workflow without putting policy in button authors. */
export function TooltipScope({
    children,
    enabled = true,
}: {
    children: ReactNode;
    enabled?: boolean;
}) {
    return <TooltipPolicy.Provider value={enabled}>{children}</TooltipPolicy.Provider>;
}

export const useTooltipScope = () => useContext(TooltipPolicy);
