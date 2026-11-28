import type { ComponentStateValue } from '#core';
import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { BoxLayoutProps, StateLinkInput, ResponsiveValue } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { RevealScopeProps } from '../../core/reveal/reveal';
import type { MotionTime } from '../../core/base/timing';
import type { LexicalDocument } from './types';

/** Rich HTML sequence, selected by a content change rather than viewport appearance. */
export interface RichTextChangeAnimate {
    when?: never;
    effect: 'textSlide' | 'textClip';
    steps: string[];
    currentStep: number;
    duration?: MotionTime;
    lineHeight?: string;
    clipHeight?: string;
}

export type LexicalTextAnimate = MotionChannels<{ change: RichTextChangeAnimate }>;

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
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'>,
        RevealScopeProps {
    preset?: Preset<LexicalTextProps>;
    states?: PresetStates<LexicalTextProps>;
    state?: ComponentStateValue;
    /** Безопасная HTML-строка либо документ Lexical с проверяемыми узлами. */
    content?: string | LexicalDocument | null;
    /** Typography preset on desktop, mobile and tablet; defaults to default. */
    variant?: ResponsiveValue<LexicalTextVariant>;
    /** Appearance and hover/idle on the host, and optional rich HTML sequence changes. */
    animate?: LexicalTextAnimate;
    /** Popup attached to the rich text host. */
    ui?: { popup?: PopupOptions };
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

export type LexicalTextPresets = PresetMap<LexicalTextProps>;
