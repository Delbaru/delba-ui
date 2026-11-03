'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type KeyboardEvent,
} from 'react';

import { UI_MESSAGES } from '../../../core/base/messages';
import * as dates from '../../../core/fields/date';
import { Calendar } from '../../Calendar';
import { Dropdown } from '../../Dropdown';
import styles from './InputCalendar.module.scss';

export interface UseDatePickerOptions {
  enabled: boolean;
  disabled?: boolean;
  value?: string;
  minValue?: string;
  maxValue?: string;
  rootRef: RefObject<HTMLElement | null>;
  anchorRef?: RefObject<HTMLElement | null>;
  onCommit(value: string): void;
  onValidate(value: string): void;
  onFocus(): void;
}

function asIsoValue(value?: string): string | undefined {
  const date = dates.parseValue(value ?? '');
  return date ? dates.formatIso(date) : undefined;
}

/** Owns only Input's popup lifecycle and translates Calendar values to the field model. */
export function useDatePicker({
  enabled,
  disabled = false,
  value,
  minValue,
  maxValue,
  rootRef,
  anchorRef,
  onCommit,
  onValidate,
  onFocus,
}: UseDatePickerOptions) {
  const available = enabled && !disabled;
  const [isOpen, setIsOpen] = useState(false);
  const [openVersion, setOpenVersion] = useState(0);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const validatedValue = useRef<string | null>(null);
  const popupAnchorRef = anchorRef ?? rootRef;

  useEffect(() => {
    if (!available) setIsOpen(false);
  }, [available]);

  const cancel = useCallback(() => setIsOpen(false), []);

  const enter = useCallback(() => {
    validatedValue.current = null;
  }, []);

  const close = useCallback(() => {
    cancel();
    const currentValue = value ?? '';
    if (validatedValue.current === currentValue) return;
    validatedValue.current = currentValue;
    onValidate(currentValue);
  }, [cancel, onValidate, value]);

  const open = useCallback(() => {
    if (!available) return;
    enter();
    setOpenVersion((current) => current + 1);
    setIsOpen(true);
    onFocus();
  }, [available, enter, onFocus]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [close, isOpen, open]);

  const pick = useCallback(
    (isoValue: string) => {
      if (!available) return;
      const date = dates.parseValue(isoValue);
      const minimum = dates.parseValue(minValue ?? '');
      const maximum = dates.parseValue(maxValue ?? '');
      if (!date || !dates.isWithinBounds(date, minimum, maximum)) return;
      onCommit(dates.formatDisplay(date));
      cancel();
      onFocus();
    },
    [available, cancel, maxValue, minValue, onCommit, onFocus],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.defaultPrevented || !available) return;

      if (isOpen && event.key === 'Tab' && !event.shiftKey) {
        const firstControl =
          surfaceRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
        if (firstControl) {
          event.preventDefault();
          firstControl.focus();
          return;
        }
      }

      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        open();
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        cancel();
      }
    },
    [available, cancel, isOpen, open],
  );

  return {
    available,
    enter,
    open,
    close,
    cancel,
    toggle,
    popup: { visible: available && isOpen, anchorRef: popupAnchorRef, surfaceRef, rootRef },
    keyboard: { handle: handleKeyDown },
    value: asIsoValue(value),
    minValue: asIsoValue(minValue),
    maxValue: asIsoValue(maxValue),
    openVersion,
    pick,
    focus: onFocus,
  };
}

type CalendarModel = ReturnType<typeof useDatePicker> & {
  id: string;
  enabled: boolean;
  leave(): void;
};

/** Adapts the field date model to the shared Dropdown surface. */
export function InputCalendar({ calendar }: { calendar: CalendarModel }) {
  if (!calendar.enabled) return null;

  return (
    <Dropdown
      anchorRef={calendar.popup.anchorRef}
      surfaceRef={calendar.popup.surfaceRef}
      focusRegions={[calendar.popup.rootRef]}
      keyboard="content"
      preserveFocus
      returnFocus={false}
      open={calendar.popup.visible}
      onOpenChange={(open, reason) => {
        if (open) return;
        if (reason === 'escape') {
          calendar.cancel();
          calendar.focus();
        } else {
          calendar.leave();
        }
      }}
      panel={{
        portal: true,
        keepMounted: false,
        viewportPadding: 8,
        className: styles.InputCalendar,
        animate: { when: 'open', effect: 'fade', duration: 'fast' },
      }}
    >
      <Calendar
          key={calendar.openVersion}
          id={`${calendar.id}-calendar`}
          dayIdPrefix={calendar.id}
          aria-label={UI_MESSAGES.input.openCalendar}
          value={calendar.value}
          minValue={calendar.minValue}
          maxValue={calendar.maxValue}
          onValueChange={calendar.pick}
      />
    </Dropdown>
  );
}
