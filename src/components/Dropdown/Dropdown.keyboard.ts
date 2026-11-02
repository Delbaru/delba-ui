import type { KeyboardEvent } from 'react';

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
const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Menu navigation is a policy; content widgets keep their own arrow keys. */
export const dropdownKeyboard = {
  items(panel: HTMLElement | null): HTMLElement[] {
    return [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      .filter(node => !node.closest('[hidden], [inert]') && node.getClientRects().length > 0);
  },
  command(event: KeyboardEvent<HTMLElement>, scope: KeyboardScope): KeyboardCommand | undefined {
    if (scope.mode === 'content') return;
    const view = event.currentTarget.ownerDocument.defaultView;
    const target = event.target;
    if (!view || !(target instanceof view.HTMLElement)) return;
    const atTrigger = scope.trigger?.contains(target);
    const items = dropdownKeyboard.items(scope.panel);
    if (scope.open && atTrigger && event.key === 'Tab' && !event.shiftKey) {
      const first = items[0];
      return first ? { action: 'focus', target: first } : undefined;
    }
    if (target.matches(EDITABLE)) return;
    if (atTrigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      if (scope.blocked) return { action: 'consume' };
      const edge = event.key === 'ArrowDown' ? 'first' : 'last';
      if (!scope.open) return { action: 'open', edge };
      const next = edge === 'first' ? items[0] : items.at(-1);
      return next ? { action: 'focus', target: next } : undefined;
    }
    if (!scope.open || !scope.panel?.contains(target)) return;
    const current = items.indexOf(target);
    const destinations: Record<string, number> = {
      Home: 0,
      End: items.length - 1,
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
    };
    const index = destinations[event.key];
    const next = index === undefined ? undefined : items[index];
    return next ? { action: 'focus', target: next } : undefined;
  },
};
