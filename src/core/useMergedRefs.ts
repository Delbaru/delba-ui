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

/**
 * Склеивает ref'ы в один колбэк: ref снаружи (проп `ref`), свой внутренний и сеттер анимации
 * получают один и тот же узел. Сохраняет очистку callback-ref в React 19; для остальных
 * ref'ов при отсоединении передаёт null. Колбэк стабилен, пока не сменились сами ref'ы.
 */
export function useMergedRefs<T>(a: Ref<T> | undefined, b: Ref<T> | undefined, c?: Ref<T>): RefCallback<T> {
  return useCallback((node: T | null) => {
    const refs = [a, b, c];
    const cleanups = refs.map((ref) => assignRef(ref, node));
    if (node === null) return;

    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (cleanup) cleanup();
        else assignRef(ref, null);
      });
    };
  }, [a, b, c]);
}
