'use client';

import { cx } from '../../../../core';
import { Flex } from '../../../Flex';
import { Skeleton } from '../../../Skeleton';
import type { InputValueProps } from '../InputControl';
import styles from './InputValue.module.scss';

/** Native value and its visual time suffix share the same field binding. */
export function InputValue({ control, decoration }: InputValueProps) {
  const rootClass = styles.InputValue;
  if (control.loading) return <Skeleton className={rootClass} h={[16, 16, 16]} />;
  const inputProps = {
    ...control.inputProps,
    className: cx(styles.field, control.field?.className),
    style: control.field?.style,
  };
  if (!decoration.time)
    return (
      <input
          {...inputProps}
          ref={control.inputRef}
          className={cx(rootClass, inputProps.className)}
          placeholder={decoration.phone ? '' : inputProps.placeholder}
      />
    );
  const mask = !control.feedback.text && decoration.time.showMask;
  return (
    <Flex
        className={cx(rootClass, styles.timeRoot)}
        position={['relative', 'relative', 'relative']}
        minW={[0, 0, 0]}
    >
      {mask && decoration.time.suffix && (
        <input
            className={cx(inputProps.className, styles.timeMask)}
            aria-hidden="true"
            tabIndex={-1}
            readOnly
            value={decoration.time.value + decoration.time.suffix}
        />
      )}
      <input
          {...inputProps}
          ref={control.inputRef}
          className={cx(inputProps.className, mask && styles.timeFieldMasked)}
      />
    </Flex>
  );
}
