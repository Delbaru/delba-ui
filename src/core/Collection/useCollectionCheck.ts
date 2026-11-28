'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DOMAttributes, SyntheticEvent } from 'react';
import { checkRangeItems } from './Check';

export interface CollectionCheckOptions<T> {
  /** Rows in range order. */
  items: readonly T[];
  scope: string;
  isChecked: (item: T) => boolean;
  canChange: (item: T) => boolean;
  /** Runs once with the changed, eligible rows and their target state. */
  onChange: (items: readonly T[], checked: boolean) => void | Promise<unknown>;
}

type CheckCaptureProps = Pick<DOMAttributes<HTMLElement>,
  'onPointerDownCapture' | 'onPointerCancelCapture' | 'onKeyDownCapture' |
  'onClickCapture' | 'onBlurCapture'>;

export interface CollectionCheckController<T> {
  busy: boolean;
  change(item: T, event: ChangeEvent<HTMLInputElement>): Promise<void>;
  checkAll(): Promise<void>;
  captureProps: CheckCaptureProps;
}

interface Scope<T> {
  token: symbol;
  options: CollectionCheckOptions<T>;
  anchor: string | null;
  shiftInput: HTMLInputElement | null;
}

function checkboxTarget(event: SyntheticEvent): HTMLInputElement | null {
  const target = event.target as Element;
  const control = target.closest?.<HTMLInputElement>('input[type="checkbox"]') ??
    target.closest?.<HTMLLabelElement>('label')?.control;
  return control?.matches('input[type="checkbox"]') ? control as HTMLInputElement : null;
}

export function useCollectionCheck<T extends { id: string }>(
  options: CollectionCheckOptions<T>,
): CollectionCheckController<T> {
  const token = useMemo(() => Symbol(options.scope), [options.scope]);
  const committed = useRef<Scope<T> | null>(null);
  // A scope change resets the gesture while an accepted write finishes.
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    if (committed.current?.token === token) {
      committed.current.options = options;
    } else {
      committed.current = { token, options, anchor: null, shiftInput: null };
    }
  });
  useLayoutEffect(() => () => {
    committed.current = null;
  }, []);

  const currentScope = () => committed.current?.token === token ? committed.current : null;
  const submit = async (current: Scope<T>, items: readonly T[], checked: boolean) => {
    if (inFlight.current || !items.length) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await current.options.onChange(items, checked);
    } finally {
      inFlight.current = false;
      if (committed.current) setBusy(false);
    }
  };

  const change = async (item: T, event: ChangeEvent<HTMLInputElement>) => {
    const current = currentScope();
    if (!current) return;
    const input = event.currentTarget;
    const checked = input.checked;
    const shift = current.shiftInput === input ||
      ('shiftKey' in event.nativeEvent && Boolean(event.nativeEvent.shiftKey));
    current.shiftInput = null;
    if (inFlight.current) return;

    const { items, isChecked, canChange } = current.options;
    const target = items.find(row => row.id === item.id);
    if (!target || !canChange(target)) return;
    const anchor = shift && items.some(row => row.id === current.anchor) ? current.anchor : null;
    if (anchor === null) current.anchor = item.id;
    await submit(current, checkRangeItems(items, anchor, item.id, checked, canChange, isChecked), checked);
  };

  const checkAll = async () => {
    const current = currentScope();
    if (!current || inFlight.current) return;
    current.shiftInput = null;
    const { items, isChecked, canChange } = current.options;
    await submit(current, items.filter(item => canChange(item) && !isChecked(item)), true);
  };

  const capture = (event: SyntheticEvent, shift: boolean) => {
    const current = currentScope();
    if (!current) return;
    current.shiftInput = shift && !inFlight.current ? checkboxTarget(event) : null;
  };
  const clearCapture = (event: SyntheticEvent) => {
    const current = currentScope();
    if (current && current.shiftInput === checkboxTarget(event)) current.shiftInput = null;
  };

  return {
    busy,
    change,
    checkAll,
    captureProps: {
      onPointerDownCapture: event => capture(event, event.shiftKey),
      onPointerCancelCapture: clearCapture,
      onKeyDownCapture: event => capture(event, (event.key === ' ' || event.key === 'Spacebar') && event.shiftKey),
      // Clicking a label may forward a new input click without the original modifiers.
      onClickCapture: event => {
        if (event.target !== checkboxTarget(event)) capture(event, event.shiftKey);
      },
      onBlurCapture: clearCapture,
    },
  };
}
