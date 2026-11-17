'use client';
import { assetUrl, cx, composeEventHandlers, useMergedRefs, type WithRef } from '../../../core';
import { Flex, type FlexProps } from '../../Flex';
import { Box } from '../../Box';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import { Skeleton } from '../../Skeleton';
import { Input } from '../../Input';
import type { SelectSearchProps } from '../Select.types';
import type { SelectController } from '../useSelect';
import { selectContent } from '../Select.content';
import arrowIcon from '../../../../assets/icons/ui/arrows/arrow-2/arrow.svg';
import styles from './SelectTrigger.module.scss';
export function SelectTrigger<T extends string>({
  select,
  search,
  loading,
  disabled,
  required,
  placeholderColor,
  ref,
  className,
  onKeyDown,
  ...triggerProps
}: WithRef<
  {
    select: SelectController<T>;
    search?: SelectSearchProps;
    loading: boolean;
    disabled?: boolean;
    required?: boolean;
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
        className={cx(styles.SelectTrigger, className)}
        w={['100%', '100%', '100%']}
        h={search ? ['100%', '100%', '100%'] : undefined}
        role={search ? undefined : "button"}
        tabIndex={search || disabled ? -1 : 0}
        id={search ? undefined : select.id}
        onKeyDown={composeEventHandlers(select.trigger.onKeyDown, onKeyDown)}
        {...(!search ? select.trigger.accessibility : {})}
        {...triggerProps}
        onClick={search ? (event) => {
          event.preventDefault();
          if (!disabled) select.popup.change(true);
        } : triggerProps.onClick}
    >
      {search ? <Input
          ref={select.trigger.inputRef}
          id={select.id}
          value={select.popup.open ? search.value : (select.value.selectedOption?.label ?? (select.value.selectedOptions.map(option => option.label).join(', ') || search.value))}
          onChange={(event) => {
            search.onChange(event.currentTarget.value);
            if (!select.popup.open) select.popup.change(true);
          }}
          placeholder={search.placeholder ?? select.trigger.accessibility['aria-label']}
          {...select.trigger.accessibility}
          aria-label={search.placeholder ?? select.trigger.accessibility['aria-label']}
          role="combobox"
          aria-autocomplete="list"
          aria-busy={loading || undefined}
          aria-activedescendant={select.popup.open && select.focus.index >= 0 && select.popup.options[select.focus.index] ? `${select.id}-option-${select.focus.index}` : undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          nativeValidation
          error={select.feedback.error}
          className={styles.SearchControl}
          rowClassName={styles.SearchRow}
          field={{ className: styles.TriggerText }}
          w={['100%', '100%', '100%']}
          h={['100%', '100%', '100%']}
      /> : <Box
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
      </Box>}

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
