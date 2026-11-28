'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';
import {
  navigationEventTarget,
  navigationItems,
  navigationStep,
  navigationTarget,
  ownsNavigationTarget,
  type NavigationOptions,
} from './Navigation';

interface NavigationScopeOptions extends NavigationOptions {
  boundary: string;
  includeAriaDisabled?: boolean;
}

/** One navigation scope with item registration through refs and focus in DOM order. */
export function useNavigation(options: NavigationScopeOptions) {
  const items = useRef(new Set<HTMLElement>());
  const register = useCallback((node: HTMLElement) => {
    items.current.add(node);
    return () => {
      items.current.delete(node);
    };
  }, []);

  return {
    register,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.defaultPrevented) return;
      if (event.key !== 'Home' && event.key !== 'End' && navigationStep(event.key, options.axis) === undefined) return;

      const root = event.currentTarget;
      const target = navigationEventTarget(root, event.target);
      if (!target || !ownsNavigationTarget(root, options.boundary, target)) return;

      const candidates = navigationItems(root, { ...options, candidates: items.current });
      if (!candidates.some(item => item.contains(target))) return;

      const next = navigationTarget(candidates, target, event.key, options);
      if (next) {
        event.preventDefault();
        next.focus();
      }
    },
  };
}
