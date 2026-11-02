'use client';
import type React from 'react';
import { assetUrl, cx, composeEventHandlers, useMergedRefs, type WithRef } from '../../../core';
import { Flex, type FlexProps } from '../../Flex';
import { Box } from '../../Box';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import { Skeleton } from '../../Skeleton';
import type { SelectController } from '../useSelect';
import arrowIcon from '../../../../assets/icons/ui/arrows/arrow-2/arrow.svg';
import styles from './SelectTrigger.module.scss';
function isPrimitiveNode(node: React.ReactNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}

function renderSelectNode(
  node: React.ReactNode,
  textClassName: string | undefined,
): React.ReactNode {
  if (isPrimitiveNode(node)) {
    return (
      <Text variant={['body', 'body', 'body']} className={textClassName} color="inherit">
        {node}
      </Text>
    );
  }

  return node;
}

export function SelectTrigger<T extends string>({
  select,
  loading,
  disabled,
  placeholderColor,
  ref,
  className,
  onKeyDown,
  ...triggerProps
}: WithRef<
  {
    select: SelectController<T>;
    loading: boolean;
    disabled?: boolean;
    placeholderColor?: string;
  } & Omit<FlexProps, 'children'>,
  HTMLElement
>) {
  const triggerRef = useMergedRefs(select.trigger.ref, ref);

  return (
    <Flex
        ref={triggerRef}
        align={['center', 'center', 'center']}
        justify={['space_between', 'space_between', 'space_between']}
        gap={[8, 8, 8]}
        className={cx('SelectTrigger', styles.SelectTrigger, className)}
        w={['100%', '100%', '100%']}
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={select.id}
        onKeyDown={composeEventHandlers(select.trigger.onKeyDown, onKeyDown)}
        {...select.trigger.accessibility}
        {...triggerProps}
    >
      <Box
        className={styles.TriggerContent}
        style={{
          color: select.feedback.inline
            ? 'var(--error)'
            : !select.value.hasValue
              ? (placeholderColor ?? 'var(--field-placeholder-color, var(--text-muted))')
              : undefined,
        }}
      >
        <Flex
          animate={{
            when: 'change',
            effect: 'fade',
            key: loading ? 'skeleton' : 'value',
            duration: 'fast',
          }}
          w={['100%', null, null]}
        >
          {loading ? (
            <Skeleton h={[16, null, null]} />
          ) : select.feedback.inline ? (
            <Text
                as="div"
                id={select.feedback.errorId}
                role="alert"
                variant={['body', 'body', 'body']}
                color="inherit"
                className={styles.TriggerText}
            >
              {select.feedback.error}
            </Text>
          ) : (
            renderSelectNode(select.value.content, styles.TriggerText)
          )}
        </Flex>
      </Box>

      <Icon
          aria-hidden
          src={assetUrl(arrowIcon)}
          fill="transparent"
          w={[20, 20, 20]}
          h={[20, 20, 20]}
          className={styles.Chevron}
      />
    </Flex>
  );
}
