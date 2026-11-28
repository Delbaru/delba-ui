'use client';

import { useState } from 'react';
import { assetUrl, preserveFocus } from '#core';
import { UI_MESSAGES } from '../../../core/base/messages';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Icon } from '../../Icon';

import calendarIcon from '#icons/controls/calendar.svg';
import chevronIcon from '#icons/controls/chevron-down-thin.svg';
import eyeIcon from '#icons/controls/eye.svg';
import styles from './InputActions.module.scss';

type Actions = ReturnType<typeof useInputActions>;

export function InputActions({ actions }: { actions: Actions }) {
  const { password, calendar, number } = actions;
  if (!password.visible && !calendar.visible && !number.visible) return null;

  return (
    <Flex
        className={styles.InputActions}
        align={['center', 'center', 'center']}
        data-input-action="true"
    >
      {password.visible && (
        <Button
            type="button"
            p={[0, 0, 0]}
            w={[24, 24, 24]}
            h={[24, 24, 24]}
            className={styles.passwordToggle}
            aria-label={password.revealed ? UI_MESSAGES.input.hidePassword : UI_MESSAGES.input.showPassword}
            onMouseDown={preserveFocus}
            onClick={password.toggle}
        >
          <Icon src={assetUrl(eyeIcon)} w={[24, 24, 24]} h={[24, 24, 24]} aria-hidden />
        </Button>
      )}
      {calendar.visible && (
        <Button
            type="button"
            p={[0, 0, 0]}
            w={[48, null, null]}
            h={[48, null, null]}
            r={[16, null, null]}
            bg={['var(--background)', 'var(--background)', 'var(--background)']}
            className={styles.dateToggle}
            aria-label={UI_MESSAGES.input.openCalendar}
            aria-expanded={calendar.open}
            aria-controls={calendar.open ? calendar.id : undefined}
            onMouseDown={preserveFocus}
            onClick={calendar.toggle}
        >
          <Icon src={assetUrl(calendarIcon)} w={[24, null, null]} h={[24, null, null]} aria-hidden />
        </Button>
      )}
      {number.visible && (
        <Flex
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            gap={[4, null, null]}
            className={styles.numberArrows}
        >
          {([1, -1] as const).map(step => (
            <Button
                key={step}
                type="button"
                p={[0, 0, 0]}
                w={[12, null, null]}
                h={[8, null, null]}
                aria-label={step === 1 ? UI_MESSAGES.input.increase : UI_MESSAGES.input.decrease}
                onMouseDown={preserveFocus}
                onClick={() => number.step(step)}
            >
              <Icon
                  src={assetUrl(chevronIcon)}
                  w={[16, null, null]}
                  h={['auto', null, null]}
                  rootClassName={step === 1 ? styles.up : undefined}
                  aria-hidden
              />
            </Button>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

interface ActionOptions {
  type: string;
  disabled?: boolean;
  readOnly: boolean;
  revealable?: boolean;
  showNumberControls?: boolean;
  step?: string | number;
  numberOptions?: number[];
  onStep(direction: 1 | -1): void;
  calendar: {
    available: boolean;
    open: boolean;
    id: string;
    toggle(): void;
  };
}

/** Owns password visibility and resolves which actions this field exposes. */
export function useInputActions(options: ActionOptions) {
  const [revealed, setRevealed] = useState(false);
  const editable = !options.disabled && !options.readOnly;
  const hasNumberSteps = options.step !== 'any' || Boolean(options.numberOptions?.length);

  return {
    password: {
      visible: !options.disabled && Boolean(options.revealable) && options.type === 'password',
      revealed,
      toggle: () => setRevealed((current) => !current),
    },
    number: {
      visible:
        options.type === 'number' &&
        editable &&
        options.showNumberControls !== false &&
        hasNumberSteps,
      step: options.onStep,
    },
    calendar: {
      visible: options.calendar.available,
      open: options.calendar.open,
      id: options.calendar.id,
      toggle: options.calendar.toggle,
    },
  };
}
