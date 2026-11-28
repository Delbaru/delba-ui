import { focusableElements } from '../base/focus';

export interface NavigationOptions {
  axis: 'vertical' | 'horizontal' | 'both';
  loop?: boolean;
}

export function navigationStep(key: string, axis: NavigationOptions['axis']): -1 | 1 | undefined {
  if (axis !== 'horizontal') {
    if (key === 'ArrowUp') return -1;
    if (key === 'ArrowDown') return 1;
  }
  if (axis !== 'vertical') {
    if (key === 'ArrowLeft') return -1;
    if (key === 'ArrowRight') return 1;
  }
  return undefined;
}

export function nextNavigationIndex(
  key: string,
  count: number,
  current: number,
  { axis, loop = false }: NavigationOptions,
): number | undefined {
  if (count === 0) return undefined;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;

  const step = navigationStep(key, axis);
  if (step === undefined) return undefined;
  if (current === -1) return step === 1 ? 0 : count - 1;

  const next = current + step;
  if (loop) return (next + count) % count;
  return Math.max(0, Math.min(count - 1, next));
}

export function navigationEventTarget(currentTarget: HTMLElement, target: EventTarget): Element | undefined {
  const view = currentTarget.ownerDocument.defaultView;
  return view && target instanceof view.Element ? target : undefined;
}

export function ownsNavigationTarget(root: HTMLElement, boundary: string, target: Element): boolean {
  return root.contains(target) && target.closest(boundary) === root;
}

interface NavigationItemsOptions {
  /** Selector that marks every root of this navigation scope, including nested roots. */
  boundary?: string;
  candidates?: Iterable<HTMLElement>;
  /** Items may remain navigable even when their action is unavailable. */
  includeAriaDisabled?: boolean;
}

export function navigationItems(
  root: HTMLElement | null,
  { boundary, candidates, includeAriaDisabled = false }: NavigationItemsOptions = {},
): HTMLElement[] {
  if (!root) return [];

  const items = candidates ? [...candidates].filter(element =>
    root.contains(element) && !element.matches(':disabled') &&
    !element.closest('[hidden], [inert]') && element.getClientRects().length > 0,
  ) : focusableElements(root);
  const owned = items.filter(element =>
    (!boundary || ownsNavigationTarget(root, boundary, element)) &&
    (includeAriaDisabled || element.getAttribute('aria-disabled') !== 'true'),
  );
  if (candidates) {
    owned.sort((left, right) => {
      if (left === right) return 0;
      return left.compareDocumentPosition(right) & left.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }
  return owned;
}

export function navigationTarget(
  items: readonly HTMLElement[],
  target: Element,
  key: string,
  options: NavigationOptions,
): HTMLElement | undefined {
  const current = items.findIndex(item => item.contains(target));
  const index = nextNavigationIndex(key, items.length, current, options);
  return index === undefined ? undefined : items[index];
}
