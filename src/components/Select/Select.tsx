'use client';

import styles from './Select.module.scss';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  composeEventHandlers,
  cx,
  createLayoutClasses,
  stateProps,
  stateLinkProps,
  fieldHelperPaddingLeft,
  type WithRef,
  fieldLayoutClasses,
  fieldRootLayoutClasses,
  resolveFieldLayout,
  splitBoxLayout,
} from '../../core';
import { Text } from '../Text';
import { Flex } from '../Flex';
import { useCollapseState } from '../../hooks/useCollapseState';
import { Dropdown } from '../Dropdown';
import { isValueArray, selectFormValues } from './options';
import { SelectOptions } from './SelectOptions/SelectOptions';
import { SelectTrigger } from './SelectTrigger/SelectTrigger';
import { UI_MESSAGES } from '../../core/base/messages';
import { useSelect } from './useSelect';
import type { SelectProps } from './Select.types';
export type { SelectProps, SelectBaseProps, SelectValueProps } from './Select.types';


const c = createLayoutClasses(styles, { local: { h: 'height' } });

const DEFAULT_PLACEHOLDER = UI_MESSAGES.select.placeholder;
const DEFAULT_EMPTY_MESSAGE = UI_MESSAGES.select.required;
const DEFAULT_VISIBLE_OPTIONS = 4;
const PANEL_VARIABLES = [
  '--select-height',
  '--select-dropdown-radius',
  '--select-dropdown-radius-top',
  '--select-option-padding',
  '--select-panel-border',
] as const;

export function Select<T extends string = string>(props: WithRef<SelectProps<T>, HTMLDivElement>) {
  const geometryRef = useRef<HTMLDivElement>(null);
  const { box, rest: fieldProps } = splitBoxLayout(props);
  const {
    ref,
    className = '',
    collapse,
    fieldClassName,
    style,
    options,
    name,
    form,
    value: valueProp,
    defaultValue,
    onChange,
    multiple,
    closeOnSelect = false,
    showSelected = true,
    renderValue,
    placeholder = DEFAULT_PLACEHOLDER,
    placeholderColor,
    loading = false,
    label,
    labelColor,
    comment,
    variant,
    size,
    perspective3d,
    parallax,
    animate,
    color,
    error: errorProp,
    disabled,
    required,
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
    visibleOptions = DEFAULT_VISIBLE_OPTIONS,
    panel,
    validate: validateProp,
    id: idProp,
    state,
    linkState,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    onClick,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    'data-point-events': dataPointEvents,
    ...restProps
  } = fieldProps;
  // Хук хранит общий `T | null | T[]`; наружу значение уходит типом своей ветки `multiple`.
  const emitChange = (next: T | null | T[]) => {
    if (multiple) {
      if (isValueArray(next)) onChange?.(next);
    } else if (!isValueArray(next)) {
      onChange?.(next);
    }
  };

  const validateValue = (next: T | null | T[]) => {
    if (multiple) return isValueArray(next) ? validateProp?.(next) : undefined;
    return isValueArray(next) ? undefined : validateProp?.(next);
  };

  const select = useSelect(ref, {
    options,
    form,
    value: valueProp,
    defaultValue,
    onChange: emitChange,
    multiple: multiple === true,
    closeOnSelect,
    showSelected,
    renderValue,
    placeholder,
    loading,
    disabled,
    required,
    emptyMessage,
    visibleOptions,
    validate: validateValue,
    id: idProp,
    error: errorProp,
    label,
    comment,
    ariaLabel,
    perspective3d,
    parallax,
    animate,
  });

  const rootCollapse = useCollapseState(collapse ?? { open: true });
  const { defaultOpen: _defaultCollapseOpen, ...collapseSettings } = collapse ?? {};
  const isCollapsed = !rootCollapse.open;

  useEffect(() => {
    if (isCollapsed) select.popup.close(false);
  }, [select.popup.close, isCollapsed]);

  const layoutProps = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });

  const fieldClasses = fieldLayoutClasses(c, layoutProps);

  return (
    <Flex
      collapse={
        collapse
          ? {
              ...collapseSettings,
              open: rootCollapse.open,
              onOpenChange: rootCollapse.changeOpen,
            }
          : undefined
      }
      href={undefined}
      dir={['column', 'column', 'column']}
      gap={[8, 8, 8]}
      className={cx(
        'Select',
        styles.Select,
        styles.SelectWrapper,
        ...fieldRootLayoutClasses(c, box),
        className,
      )}
      style={{ ...(select.motion.style ?? null), ...style }}
      ref={select.motion.ref}
      data-point-events={dataPointEvents}
      {...restProps}
      {...select.motion.attrs}
      {...stateLinkProps(linkState, {
        onMouseEnter: composeEventHandlers(select.motion.handlers?.onMouseEnter, onMouseEnter),
        onMouseMove: composeEventHandlers(select.motion.handlers?.onMouseMove, onMouseMove),
        onMouseLeave: composeEventHandlers(select.motion.handlers?.onMouseLeave, onMouseLeave),
        onMouseDown,
        onMouseUp,
        onClick,
        onFocus,
        onBlur,
      })}
    >
      {label && (
        <Flex dir={['row', 'row', 'row']} gap={required ? [4, 4, 4] : [0, 0, 0]}>
          <Text variant={['caption', 'caption', 'caption']} color={labelColor}>{label}</Text>

          {required && (
            <Text variant={['caption', 'caption', 'caption']} color="var(--error)">
              *
            </Text>
          )}
        </Flex>
      )}

      <Dropdown
        ref={geometryRef}
        open={select.popup.open}
        onOpenChange={select.popup.change}
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            !event.defaultPrevented &&
            !disabled &&
            !loading
          )
            select.popup.change(!select.popup.open);
        }}
        trigger={
          <SelectTrigger
              {...select.trigger.accessibility}
              id={select.id}
              select={select}
              loading={loading}
              disabled={disabled}
              placeholderColor={placeholderColor}
          />
        }
        className={cx(styles.field, ...fieldClasses, fieldClassName)}
        style={{ '--select-visible-options': String(select.popup.visibleOptions) } as CSSProperties}
        {...stateProps(
          state,
          select.feedback.error && 'error',
          disabled && 'disabled',
          select.popup.open && 'open',
        )}
        panel={{
          portal: true,
          offset: -1,
          ...panel,
          matchTriggerWidth: true,
          anchorRef: geometryRef,
          inheritVariables: PANEL_VARIABLES,
          className: styles.Dropdown,
          onKeyDown: select.trigger.onKeyDown,
        }}
      >
        <SelectOptions select={select} multiple={multiple} />
      </Dropdown>

      {name &&
        !disabled &&
        selectFormValues(select.value.current, multiple === true).map((itemValue, index) => (
          <input
              key={`${itemValue}-${index}`}
              type="hidden"
              name={name}
              form={form}
              value={itemValue}
          />
        ))}

      {!select.feedback.error && comment && (
        <Text
            as="div"
            variant={['caption', 'caption', 'caption']}
            id={select.feedback.commentId}
            color="var(--text-muted)"
            pl={fieldHelperPaddingLeft(layoutProps.p, layoutProps.pl)}
        >
          {comment}
        </Text>
      )}
    </Flex>
  );
}
