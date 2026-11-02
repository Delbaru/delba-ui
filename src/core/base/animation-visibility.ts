/** IntersectionObserver accepts one to four pixel/percentage margins, including negative ones. */
import { normalizeObserverMargin } from './observer-margin';
export const isVisibilityMargin = (value: unknown): boolean =>
  normalizeObserverMargin(value) !== null;

/** Configured preparation area for continuous motion; independent of appearance observers. */
export function animationVisibilityMargin(node: Element): string {
  const view = node.ownerDocument.defaultView;
  const value = view
    ?.getComputedStyle(node)
    .getPropertyValue('--t-m-visibility-root-margin')
    .trim();
  return normalizeObserverMargin(value) ?? '100px';
}

/** Shared visibility lifecycle for CSS motion and JS playback; observers belong to the node's realm. */
export function observeAnimationVisibility(
  node: Element,
  change: (visible: boolean) => void,
  margin = animationVisibilityMargin(node),
): () => void {
  const doc = node.ownerDocument;
  const view = doc.defaultView;
  let visible = !view?.IntersectionObserver;
  const update = () => change(visible && !doc.hidden);
  const observer = view?.IntersectionObserver
    ? new view.IntersectionObserver(
        ([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          update();
        },
        { rootMargin: margin },
      )
    : null;
  observer?.observe(node);
  doc.addEventListener('visibilitychange', update);
  update();
  return () => {
    observer?.disconnect();
    doc.removeEventListener('visibilitychange', update);
  };
}
