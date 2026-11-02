import type { CSSProperties } from 'react';
import type { WithRef } from '../../core';

import {
  createLayoutClasses,
  cx,
  fieldHelperPaddingLeft,
  fieldLayoutClasses,
  fieldRootLayoutClasses,
  resolveFieldLayout,
  splitBoxLayout,
  stateProps,
} from '../../core';
import { textFont } from '../../core/base/typography';
import type { InputProps } from './Input.types';
import styles from './Input.module.scss';

const classes = createLayoutClasses(styles, { local: { h: 'height' } });

interface FieldState {
  active: boolean;
  hasValue: boolean;
  readOnly: boolean;
  error?: string;
  inputType: string;
}

type AppearanceOptions = Pick<
  InputProps,
  | 'variant'
  | 'size'
  | 'font'
  | 'color'
  | 'placeholderColor'
  | 'label'
  | 'labelColor'
  | 'required'
  | 'className'
  | 'style'
  | 'rowClassName'
  | 'state'
  | 'linkState'
  | 'animate'
  | 'perspective3d'
  | 'parallax'
  | 'collapse'
> &
  import('../../core').BoxLayoutProps;

/** Resolves visual state and motion; input value and events stay with the field model. */
function appearance(props: AppearanceOptions, state: FieldState) {
  const { box } = splitBoxLayout(props);
  const layout = resolveFieldLayout({
    ...box,
    variant: props.variant,
    size: props.size,
    color: props.color,
    placeholderColor: props.placeholderColor,
  });
  const fontStyle: CSSProperties | undefined = props.font
    ? ({ '--field-font-variant': textFont(props.font) } as CSSProperties)
    : undefined;

  return {
    helperPadding: fieldHelperPaddingLeft(layout.p, layout.pl),
    label: props.label
      ? {
          text: props.label,
          color: props.labelColor,
          required: props.required,
        }
      : undefined,
    root: {
      className: cx(
        'Input',
        styles.Input,
        ...fieldRootLayoutClasses(classes, box),
        state.inputType,
        styles[state.inputType],
        props.className,
      ),
      style: props.style,
      collapse: props.collapse,
      ...stateProps(state.active && 'active'),
    },
    control: {
      className: cx(
        props.font && styles.font,
        ...fieldLayoutClasses(classes, layout),
        props.rowClassName,
      ),
      style: fontStyle,
      ...stateProps(
        props.state,
        state.error && 'error',
        state.active && 'active',
        state.hasValue && 'filled',
        state.readOnly && 'readonly',
      ),
    },
  };
}

/** Separates public field behavior from layout/decoration and native input attributes. */
function read(props: WithRef<InputProps, HTMLInputElement>) {
  const { rest } = splitBoxLayout(props);
  const {
    ref,
    type,
    value,
    defaultValue,
    error,
    id,
    disabled,
    onChange,
    onValueChange,
    onFocus,
    onBlur,
    onKeyDown,
    required,
    emptyMessage,
    validate,
    placeholder,
    seed,
    length,
    numberOptions,
    phone,
    variant,
    size,
    font,
    color,
    placeholderColor,
    label,
    labelColor,
    comment,
    className,
    style,
    rowClassName,
    field,
    slots,
    loading,
    revealable,
    showNumberControls,
    errorPlacement,
    nativeValidation,
    collapse,
    state,
    linkState,
    animate,
    perspective3d,
    parallax,
    'data-point-events': pointEvents,
    ...inputProps
  } = rest;

  return {
    ref,
    type,
    value,
    defaultValue,
    error,
    id,
    disabled,
    onChange,
    onValueChange,
    onFocus,
    onBlur,
    onKeyDown,
    required,
    emptyMessage,
    validate,
    placeholder,
    seed,
    length,
    numberOptions,
    phoneFormat: phone,
    onInvalid: inputProps.onInvalid,
    inputProps: { ...inputProps, placeholder },
  };
}

export const inputConfig = { read, appearance };
