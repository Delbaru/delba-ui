/** IntersectionObserver accepts one to four pixel/percentage margins, including negative ones. */
import { normalizeObserverMargin } from './observer-margin';
export const isVisibilityMargin = (value: unknown): boolean => normalizeObserverMargin(value) !== null;

/** Configured preparation area for continuous motion; independent of appearance observers. */
export function animationVisibilityMargin(node: Element): string {
  const value = getComputedStyle(node).getPropertyValue('--t-m-visibility-root-margin').trim();
  return normalizeObserverMargin(value) ?? '100px';
}
