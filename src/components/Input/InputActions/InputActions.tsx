'use client';

import type { KeyboardEvent } from 'react';

import { assetUrl, cx, preserveFocus } from '../../../core';
import { UI_MESSAGES } from '../../../core/base/messages';
import { Flex } from '../../Flex';
import { Icon } from '../../Icon';

import calendarIcon from '../../../../assets/icons/ui/calendar/style-1/calendar.svg';
import chevronIcon from '../../../../assets/icons/ui/arrows/style-3/arrow.svg';
import gazeAwayIcon from '../../../../assets/icons/ui/eye/style-1/gaze-away.svg';
import eyeIcon from '../../../../assets/icons/ui/eye/style-1/eye.svg';
import styles from './InputActions.module.scss';
import { useState } from 'react';

type Actions = ReturnType<typeof useInputActions>;

export function InputActions({ actions }: { actions: Actions }) {
  if (!actions.password.visible && !actions.calendar.visible && !actions.number.visible)
    return null;

  return (
    <Flex
        className={cx('InputActions', styles.InputActions)}
        align={['center', 'center', 'center']}
        data-input-action="true"
        onClick={preserveFocus}
    >
      {actions.password.visible && (
        <Icon
          src={actions.password.revealed ? assetUrl(gazeAwayIcon) : assetUrl(eyeIcon)}
          animate={{ when: 'change', effect: 'swap', duration: 'fast' }}
          rootW={[24, 24, 24]}
          rootH={[24, 24, 24]}
          w={[24, 24, 24]}
          h={[24, 24, 24]}
          rootClassName={styles.passwordToggle}
          role="button"
          tabIndex={0}
          aria-label={
            actions.password.revealed
              ? UI_MESSAGES.input.hidePassword
              : UI_MESSAGES.input.showPassword
          }
          data-input-action="true"
          onMouseDown={preserveFocus}
          onClick={actions.password.toggle}
          onKeyDown={(event) => activateWithKeyboard(event, actions.password.toggle)}
        />
      )}
      {actions.calendar.visible && (
        <Icon
            src={assetUrl(calendarIcon)}
            rootW={[48, null, null]}
            rootH={[48, null, null]}
            w={[24, null, null]}
            h={[24, null, null]}
            rootR={[16, null, null]}
            rootBg={['var(--background)', 'var(--background)', 'var(--background)']}
            rootClassName={styles.dateToggle}
            data-input-action="true"
            role="button"
            tabIndex={0}
            aria-label={UI_MESSAGES.input.openCalendar}
            onMouseDown={preserveFocus}
            onClick={actions.calendar.toggle}
            onKeyDown={(event) => activateWithKeyboard(event, actions.calendar.toggle)}
        />
      )}
      {actions.number.visible && (
        <Flex
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            gap={[4, null, null]}
            className={styles.numberArrows}
        >
          <Icon
              src={assetUrl(chevronIcon)}
              rootW={[12, null, null]}
              rootH={[8, null, null]}
              w={[16, null, null]}
              h={['auto', null, null]}
              rootClassName={cx(styles.btn, styles.up)}
              data-input-action="true"
              role="button"
              tabIndex={0}
              aria-label={UI_MESSAGES.input.increase}
              onMouseDown={preserveFocus}
              onClick={() => actions.number.step(1)}
              onKeyDown={(event) => activateWithKeyboard(event, () => actions.number.step(1))}
          />
          <Icon
              src={assetUrl(chevronIcon)}
              rootW={[12, null, null]}
              rootH={[8, null, null]}
              w={[16, null, null]}
              h={['auto', null, null]}
              rootClassName={cx(styles.btn, styles.down)}
              data-input-action="true"
              role="button"
              tabIndex={0}
              aria-label={UI_MESSAGES.input.decrease}
              onMouseDown={preserveFocus}
              onClick={() => actions.number.step(-1)}
              onKeyDown={(event) => activateWithKeyboard(event, () => actions.number.step(-1))}
          />
        </Flex>
      )}
    </Flex>
  );
}

function activateWithKeyboard(event: KeyboardEvent<Element>, activate: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activate();
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
  calendar: { available: boolean; toggle(): void };
}

/** Owns password visibility and resolves which actions this field exposes. */
export function useInputActions(options: ActionOptions) {
  const [revealed, setRevealed] = useState(false);
  const editable = !options.disabled && !options.readOnly;
  const hasNumberSteps = options.step !== 'any' || Boolean(options.numberOptions?.length);

  return {
    password: {
      visible: Boolean(options.revealable) && options.type === 'password',
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
      toggle: options.calendar.toggle,
    },
  };
}
