import type { CSSProperties, HTMLAttributes } from 'react';
import type { BoxLayoutProps, StateLinkInput, ResponsiveInput, ResponsiveValue } from '../../core';
import type { RevealProps } from '../../core/reveal/reveal';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { MotionTime } from '../../core/base/timing';
import type { LexicalDocument } from './types';

export type AnimationKey = 'counter' | 'textSlide' | 'textClip';

export interface TextSlideOptions {
  steps: string[];
  currentStep: number;
  duration?: MotionTime;
  lineHeight?: string;
}

export interface TextClipOptions {
  steps: string[];
  currentStep: number;
  duration?: MotionTime;
  clipHeight?: string;
}

export type AnimationInput =
  | AnimationKey
  | [AnimationKey]
  | [AnimationKey, TextSlideOptions | TextClipOptions];


/** Rich HTML sequence, selected by a content change rather than viewport appearance. */
export interface RichTextChangeAnimate {
  when: 'change';
  effect: 'textSlide' | 'textClip';
  steps: string[];
  currentStep: number;
  duration?: MotionTime;
  lineHeight?: string;
  clipHeight?: string;
}

/** `plain` — без типографики варианта: блоки наследуют шрифт окружения, роль (`role-*`) по-прежнему красит блок. */
export type LexicalTextVariant =
  | 'default'
  | 'plain'
  | 'style-1'
  | 'style-2'
  | 'style-3'
  | 'style-4'
  | 'style-5';

export interface LexicalTextProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'color' | 'content'>,
    BoxLayoutProps,
    SharedMotionProps<RichTextChangeAnimate>,
    RevealProps {
  /** Безопасная HTML-строка либо документ Lexical с проверяемыми узлами. */
  content?: string | LexicalDocument | null;
  /** Typography preset on desktop, mobile and tablet; defaults to default. */
  variant?: ResponsiveValue<LexicalTextVariant>;
  /** @deprecated Use object animate with when: change and textSlide/textClip. */
  animation?: ResponsiveInput<AnimationInput>;
  /** Plain-text preview clamped to this many rows. */
  rows?: ResponsiveValue<number>;
  /** Single-line plain-text preview when rows is absent. */
  ellipsis?: boolean;

  /** Text color token or CSS color. */
  color?: string;
  /** Additional classes on the stable root. */
  className?: string;
  /** Inline root overrides. */
  style?: CSSProperties;

  /** Inline links are active by default; `text` keeps link content without nested anchors. */
  links?: 'active' | 'text';
  /** Link interaction state shared with composed descendants. */
  linkState?: StateLinkInput;
}
