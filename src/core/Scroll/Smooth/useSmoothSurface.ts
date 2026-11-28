'use client';

import { useLayoutEffect, useMemo } from 'react';
import { motionScroll } from '../../base/motion-config';
import { cancelActiveScroll, registerScrollProvider, scrollTo, unregisterScrollProvider } from '../../base/scroll';
import { createSmoothScroll } from './engine';
import type { SmoothOptions, SmoothScrollApi, SmoothScrollConfig } from './types';
import { createSmoothViewport } from './viewport';

function resolveConfig({
  lerp = motionScroll.lerp,
  duration = motionScroll.duration,
  easing = motionScroll.easing,
  offset = motionScroll.offset,
  wheelMultiplier = 1,
  mobile = false,
  anchors = true,
  updateHash = true,
}: SmoothOptions): SmoothScrollConfig {
  return { lerp, duration, easing, offset, wheelMultiplier, mobile, anchors, updateHash };
}

function createBinding(target: SmoothOptions['target']) {
  let node: HTMLElement | null = null;
  let options: SmoothOptions | undefined;
  let connection: ReturnType<typeof connect> | undefined;
  let pending: Parameters<SmoothScrollApi['scrollTo']> | undefined;
  const listeners = new Set<(y: number) => void>();
  const scope: SmoothScrollApi = {
    scrollTo(...args) {
      if (connection) connection.engine.scrollTo(...args);
      else pending = args;
    },
    stop() {
      pending = undefined;
      connection?.engine.stop();
    },
    get scrollY() {
      return connection?.position() ?? 0;
    },
    subscribe(listener) {
      const subscription = (y: number) => listener(y);
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
  };

  function connect(node: HTMLElement, options: SmoothOptions) {
    const viewport = createSmoothViewport(node.ownerDocument, target === 'self' ? node : undefined);
    if (!viewport) return;
    const { document, view, host, events, position } = viewport;
    const engine = createSmoothScroll(viewport, resolveConfig(options));
    const globalWindow = !host && document === globalThis.document;
    if (host || globalWindow) registerScrollProvider(engine, host);
    const unsubscribe = events.subscribe(y => {
      for (const listener of listeners) listener(y);
    });

    let pathname = options.pathname;
    let traversalPath: string | undefined;
    const traverse = () => { traversalPath = view.location.pathname; };
    if (!host) view.addEventListener('popstate', traverse);

    return {
      engine,
      position,
      configure(next: SmoothOptions) {
        engine.configure(resolveConfig(next));
        const changed = next.pathname !== undefined && pathname !== next.pathname;
        pathname = next.pathname;
        if (!changed) return;

        if (globalWindow) cancelActiveScroll();
        engine.stop();
        const isTraversal = pathname === traversalPath;
        traversalPath = undefined;
        if (isTraversal) return;

        engine.scrollTo(0, { immediate: true });
        if (view.location.hash) {
          if (globalWindow) void scrollTo(view.location.hash);
          else engine.scrollTo(view.location.hash);
        }
      },
      disconnect() {
        if (!host) view.removeEventListener('popstate', traverse);
        if (host || globalWindow) unregisterScrollProvider(engine, host);
        unsubscribe();
        engine.destroy();
      },
    };
  }

  const attach = () => {
    if (connection || !node || !options) return;
    connection = connect(node, options);
    if (connection && pending) {
      const args = pending;
      pending = undefined;
      connection.engine.scrollTo(...args);
    }
  };

  return {
    scope,
    ref: (host: HTMLElement | null) => {
      if (node === host) return;
      connection?.disconnect();
      connection = undefined;
      node = host;
      attach();
    },
    configure(next: SmoothOptions) {
      options = next;
      if (connection) connection.configure(next);
      else attach();
    },
  };
}

export function useSmoothSurface(options?: SmoothOptions) {
  const target = options?.target;
  const binding = useMemo(() => target ? createBinding(target) : undefined, [target]);
  useLayoutEffect(() => {
    if (options) binding?.configure(options);
  }, [binding, options]);
  return binding;
}
