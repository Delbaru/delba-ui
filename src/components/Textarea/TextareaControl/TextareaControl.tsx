'use client';

import { cx } from '../../../core';
import { Flex } from '../../Flex';
import { Skeleton } from '../../Skeleton';
import { Text } from '../../Text';
import type { useTextarea } from '../Textarea.model';
import styles from './TextareaControl.module.scss';

export function TextareaControl({
  control,
}: {
  control: ReturnType<typeof useTextarea>['control'];
}) {
  return (
    <Flex
      {...control.appearance}
      className={cx(styles.TextareaControl, control.appearance.className)}
      position={['relative', 'relative', 'relative']}
      align={['stretch', 'stretch', 'stretch']}
      data-has-counter={
        (control.counter.visible && control.counter.placement === 'inside') || undefined
      }
      data-inline-error={control.feedback.text ? 'true' : undefined}
      role="presentation"
      onClick={control.focus}
    >
      <Flex
        w={['100%', '100%', '100%']}
        animate={{
          when: 'change',
          effect: 'fade',
          key: control.loading ? 'skeleton' : 'value',
          duration: 'fast',
        }}
      >
        {control.loading ? (
          <Skeleton rows={control.rows} h={[16, 16, 16]} />
        ) : (
          <textarea
              {...control.native}
              ref={control.ref}
              className={cx(styles.field, control.fieldStyle?.className)}
              style={control.fieldStyle?.style}
          />
        )}
      </Flex>
      {control.feedback.text && (
        <Text
            id={control.feedback.id}
            role="alert"
            variant={['body', 'body', 'body']}
            color="var(--error)"
            className={styles.inlineError}
        >
          {control.feedback.text}
        </Text>
      )}
      {control.counter.visible && control.counter.placement === 'inside' && (
        <Text
            variant={['caption', 'caption', 'caption']}
            fontSize={[8, 8, 8]}
            color="var(--text-muted)"
            aria-live="polite"
            className={styles.counter}
        >
          {control.counter.text}
        </Text>
      )}
    </Flex>
  );
}
