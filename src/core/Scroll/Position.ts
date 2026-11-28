export function holdVisibleScrollPosition(
  element: HTMLElement,
  root: HTMLElement | null,
  maxDuration = 2000,
): () => void {
  const view = root?.ownerDocument.defaultView;
  if (!view || !root) return () => {};

  const document = root.ownerDocument;
  const floor = parseFloat(view.getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const until = view.performance.now() + maxDuration;
  let frame = 0;
  let settled = 0;

  const stop = () => {
    view.cancelAnimationFrame(frame);
    view.removeEventListener('wheel', stop);
    view.removeEventListener('touchstart', stop);
  };
  const tick = () => {
    const shift = Math.min(element.getBoundingClientRect().top - floor, 0);
    if (Math.abs(shift) >= 1) view.scrollBy({ top: shift, behavior: 'instant' });
    const moving = root.getAnimations({ subtree: true }).length > 0;
    settled = moving || Math.abs(shift) >= 1 ? 0 : settled + 1;
    if (settled < 3 && view.performance.now() < until) {
      frame = view.requestAnimationFrame(tick);
    } else {
      stop();
    }
  };

  view.addEventListener('wheel', stop, { passive: true });
  view.addEventListener('touchstart', stop, { passive: true });
  frame = view.requestAnimationFrame(tick);
  return stop;
}
