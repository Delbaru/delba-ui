'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SmoothScrollApi } from './types';

const Context = createContext<SmoothScrollApi | null>(null);

export function SmoothScope({ controller, children }: { controller: SmoothScrollApi; children: ReactNode }) {
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}

export function useScopedSmoothScroll(): SmoothScrollApi {
  const controller = useContext(Context);
  if (!controller) throw new Error('ui.scroll.smooth.use requires a Flex with a smooth scroll preset');
  return controller;
}
