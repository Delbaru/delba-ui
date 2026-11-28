import type { KeyboardEvent } from 'react';
import {
  navigationEventTarget,
  navigationItems,
  navigationStep,
  navigationTarget,
  ownsNavigationTarget,
  type NavigationOptions,
} from '#core/Navigation';

type Edge = 'first' | 'last';
type KeyboardCommand = { action: 'open'; edge: Edge } | { action: 'focus'; target: HTMLElement } | { action: 'consume' };
interface KeyboardScope {
  trigger: HTMLElement | null;
  panel: HTMLElement | null;
  open: boolean;
  blocked: boolean;
  mode: 'menu' | 'content';
}
const EDITABLE = 'input, textarea, select, [contenteditable="true"]';
const PANEL = '[data-dropdown-ancestors]';
const MENU_NAVIGATION = { axis: 'vertical', loop: true } as const satisfies NavigationOptions;

/** Menu navigation is a policy; content widgets keep their own arrow keys. */
export const dropdownKeyboard = {
  items(panel: HTMLElement | null): HTMLElement[] {
    return navigationItems(panel, { boundary: PANEL });
  },
  command(event: KeyboardEvent<HTMLElement>, scope: KeyboardScope): KeyboardCommand | undefined {
    if (scope.mode === 'content' || event.defaultPrevented) return;
    const target = navigationEventTarget(event.currentTarget, event.target);
    if (!target) return;

    const atTrigger = scope.trigger?.contains(target);
    if (scope.open && atTrigger && event.key === 'Tab' && !event.shiftKey) {
      const first = dropdownKeyboard.items(scope.panel)[0];
      return first ? { action: 'focus', target: first } : undefined;
    }
    if (target.closest(EDITABLE)) return;

    const step = navigationStep(event.key, MENU_NAVIGATION.axis);
    if (atTrigger && step !== undefined) {
      if (scope.blocked) return { action: 'consume' };
      const edge = step === 1 ? 'first' : 'last';
      if (!scope.open) return { action: 'open', edge };

      const items = dropdownKeyboard.items(scope.panel);
      const next = edge === 'first' ? items[0] : items.at(-1);
      return next ? { action: 'focus', target: next } : undefined;
    }
    if (!scope.open || !scope.panel || !ownsNavigationTarget(scope.panel, PANEL, target)) return;
    if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;

    const next = navigationTarget(dropdownKeyboard.items(scope.panel), target, event.key, MENU_NAVIGATION);
    return next ? { action: 'focus', target: next } : undefined;
  },
};
