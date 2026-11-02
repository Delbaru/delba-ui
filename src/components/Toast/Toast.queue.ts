import type { ToastItem } from './Toast.types';

/** Keep closing cards mounted while limiting the number of open cards. */
export function appendToast(items: ToastItem[], item: ToastItem, limit: number): ToastItem[] {
  const next = [...items, item];
  let excess = Math.max(0, next.filter(card => card.open).length - limit);

  return next.map(card => {
    if (!card.open || excess === 0) return card;
    excess -= 1;
    return { ...card, open: false };
  });
}
