'use client';
import { assetUrl, cx, composeEventHandlers, useMergedRefs, type WithRef } from '../../../core';
import { Flex, type FlexProps } from '../../Flex';
import { Box } from '../../Box';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import { Skeleton } from '../../Skeleton';
import type { SelectController } from '../useSelect';
import { selectContent } from '../Select.content';
import arrowIcon from '../../../../assets/icons/ui/arrows/arrow-2/arrow.svg';
import styles from './SelectTrigger.module.scss';
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
          color: select.feedback.inline.text
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
          ) : select.feedback.inline.text ? (
            <Text
                as="div"
                id={select.feedback.inline.id}
                role="alert"
                variant={['body', 'body', 'body']}
                color="inherit"
                className={styles.TriggerText}
            >
              {select.feedback.error}
            </Text>
          ) : (
            selectContent.render(select.value.content, styles.TriggerText)
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
