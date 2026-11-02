'use client';
import type { MouseEvent, ReactNode } from 'react';
import { cx, preserveFocus } from '../../../core';
import { Flex } from '../../Flex';
import { Text } from '../../Text';
import type { useInput } from '../Input.model';
import { InputValue } from './InputValue/InputValue';
import { InputPhoneMask } from './InputPhoneMask/InputPhoneMask';
import { InputInlineError } from './InputInlineError/InputInlineError';
import styles from './InputControl.module.scss';
export type InputValueProps = Pick<ReturnType<typeof useInput>, 'control' | 'decoration'>;
interface InputControlProps extends InputValueProps {
  start?: ReactNode;
  end?: ReactNode;
  children?: ReactNode;
}
function preserveInputFocus(event: MouseEvent<HTMLElement>) {
  const owner = event.currentTarget.ownerDocument.defaultView;
  if (!owner || !(event.target instanceof owner.Element)) return;
  if (!event.currentTarget.contains(event.target)) return;
  if (event.target.closest('[data-input-action="true"]')) return;
  if (event.target instanceof owner.HTMLInputElement) return;
  preserveFocus(event);
}
export function InputControl({ control, decoration, start, end, children }: InputControlProps) {
  return (
    <Flex
        {...control.appearance}
        className={cx('InputControl', styles.InputControl, control.appearance.className)}
        position={['relative', 'relative', 'relative']}
        minW={[0, 0, 0]}
        ref={control.rowRef}
        dir={['row', 'row', 'row']}
        align={['center', 'center', 'center']}
        gap={start != null || end != null ? [8, 8, 8] : undefined}
        data-phone-prefix={Boolean(decoration.phone) || undefined}
        data-inline-error={control.feedback.text ? 'true' : undefined}
        onMouseDown={preserveInputFocus}
        onClick={control.onClick}
        onBlur={control.onBlur}
        onMouseEnter={control.onMouseEnter}
        onMouseLeave={control.onMouseLeave}
    >
      {start != null && <Flex data-input-action="true">{start}</Flex>}
      {decoration.phone && (
        <Text
            variant={[null, null, null]}
            color="var(--primary)"
            className={styles.phonePrefix}
            mr={[8, 8, 8]}
        >
          {decoration.phone.dial}
        </Text>
      )}
      <Flex
          className={styles.fieldSlot}
          position={['relative', 'relative', 'relative']}
          minW={[0, 0, 0]}
          align={['center', 'center', 'center']}
      >
        {decoration.phone && decoration.empty && !control.loading && (
          <InputPhoneMask format={decoration.phone} />
        )}
        <Flex
          animate={{
            when: 'change',
            effect: 'fade',
            key: control.loading ? 'skeleton' : 'value',
            duration: 'fast',
          }}
          w={['100%', '100%', '100%']}
        >
          <InputValue control={control} decoration={decoration} />
        </Flex>
        <InputInlineError message={control.feedback.text} id={control.feedback.id} />
      </Flex>
      {end != null && <Flex data-input-action="true">{end}</Flex>}
      {children}
    </Flex>
  );
}
