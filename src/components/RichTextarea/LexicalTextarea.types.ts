import type { CSSProperties } from 'react';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { BoxLayoutProps, ComponentStateValue, StateLinkInput } from '../../core';
import type { LexicalTextVariant } from '../RichText';
import type { LexicalTextareaChangePayload, LexicalTextareaContent, LexicalTextareaVariable } from './types';
import type { CollapseOptions } from '../Collapse/CollapseWrap';

export interface LexicalTextareaProps
  extends BoxLayoutProps, SharedMotionProps {
  /** Contenteditable identifier; generated when omitted. */
  id?: string;
  /** Additional classes on the complete editor. */
  className?: string;
  /** Outer composition styles. */
  style?: CSSProperties;


  /** Editable text color. */
  color?: string;
  /** Hint displayed while the document is empty. */
  placeholder?: string;
  /** Hint color; defaults to the field placeholder token. */
  placeholderColor?: string;
  /** Accessible editor label. */
  label?: string;
  /** Label text color. */
  labelColor?: string;
  /** Supporting text shown when no error is present. */
  comment?: string;
  /** Rich typography preset; defaults to style-1. */
  variant?: LexicalTextVariant;

  /** External document synchronized without a user change notification. */
  content?: LexicalTextareaContent | string;
  /** Available inline variable tokens. */
  variables?: LexicalTextareaVariable[];
  /** Show the link toolbar action; defaults to true. */
  allowLink?: boolean;
  /** User edits and explicit document commands report the current snapshot. */
  onChange?: (payload: LexicalTextareaChangePayload) => void;

  /** Minimum nonempty document length; validates without preventing typing. */
  minLength?: number;
  /** Maximum document length; validates without preventing typing. */
  maxLength?: number;

  /** External error, taking priority over internal validation. */
  error?: string;
  /** Сворачивать редактор целиком, включая подпись, ошибку и комментарий. */
  collapse?: CollapseOptions;
  /** Additional component states; internal validation adds error. */
  state?: ComponentStateValue;

  /** Require a nonempty document and expose aria-required. */
  required?: boolean;
  /** Required error override; defaults to ui.config messages.richTextarea.required. */
  emptyMessage?: string;
  /** Custom validation after required and length rules. */
  validate?: (payload: LexicalTextareaChangePayload) => string | undefined;

  /** Shared interaction state of a linked composition. */
  linkState?: StateLinkInput;
  /** Optional integration marker on the outer root. */
  'data-point-events'?: string;
}
