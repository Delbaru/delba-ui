import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { InteractiveRootProps } from '#core/Element';
import type { SurfaceMotionOptions } from '#core/Motion';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { TextAnimate } from './animations/types';
import type { TextFormat } from './formatContent';

/**
 * Вариант проекта (`UiTypography`), служебная роль кита или 'inherit' — не навязывать типографику:
 * для Text внутри Text (цветные куски чужого заголовка).
 */
type VariantKey = TextVariantName | TextRole | 'inherit';

export interface TextProps
    extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
        Pick<InteractiveRootProps, 'href' | 'target' | 'rel' | 'download' | 'prefetch'>,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<TextProps>;
    states?: PresetStates<TextProps>;
    children?: React.ReactNode;
    style?: CSSProperties;
    format?: ResponsiveValue<TextFormat>;
    /** Text-only hosts receive the final text as a string. Hosts that admit spans can animate the content. */
    animate?: TextAnimate;
    /** Popup attached to the text host. */
    ui?: { popup?: PopupOptions };
    required?: boolean;

    newTab?: boolean;
    nofollow?: boolean;
    noreferrer?: boolean;

    as?: keyof React.JSX.IntrinsicElements;
    /** Machine-readable date when rendered as time. */
    dateTime?: React.TimeHTMLAttributes<HTMLTimeElement>['dateTime'];
    /** Associates Text rendered as a label with its native form control. */
    htmlFor?: React.LabelHTMLAttributes<HTMLLabelElement>['htmlFor'];
    variant?: ResponsiveValue<VariantKey>;
    /** Сворачивание текста с сохранением содержимого до конца анимации закрытия. Для блочного текста. */
    collapse?: CollapseOptions;

    color?: string;
    rows?: ResponsiveValue<number>;
    ellipsis?: boolean;

    state?: ComponentStateValue;

    linkState?: StateLinkInput;
}

/** Named native visual defaults authored by the consumer. */
export type TextPresets = PresetMap<TextProps>;
