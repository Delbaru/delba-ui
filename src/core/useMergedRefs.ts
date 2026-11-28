import { useCallback, type Ref, type RefCallback } from 'react';

/** Присваивает узел ref'у любого вида: функции, объекту `{ current }` или пустоте. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void | (() => void) {
  if (typeof ref === 'function') {
    return ref(node);
  }

  if (ref) {
    (ref as { current: T | null }).current = node;
  }
}

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node: T | null) => {
    const cleanups = refs.map((ref) => assignRef(ref, node));
    if (node === null) return;
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (cleanup) cleanup();
        else assignRef(ref, null);
      });
    };
  };
}

export function useMergedRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  // Keep ref slots stable; use undefined for an inactive binding.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(mergeRefs(...refs), refs);
}
