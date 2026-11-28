import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { LinkPrefetchProps } from '../../hooks/useLinkPrefetch';
import type { SurfaceAnimate, SurfaceMotionOptions } from '#core/Motion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { ActionOptions } from '#core/Form';
import type { ActionInvocationResult } from '../../hooks/useActionInvocation';

export type ButtonVariant = 'primary' | 'secondary' | 'secondaryFill' | 'tertiary';
export type ButtonSize = 'small' | 'medium' | 'large';

type AlignItemsKey =
    | 'stretch'
    | 'center'
    | 'flex_start'
    | 'flex_end'
    | 'start'
    | 'end'
    | 'baseline';
type JustifyContentKey =
    | 'start'
    | 'end'
    | 'center'
    | 'space_between'
    | 'space_around'
    | 'space_evenly';

/** Независимые эффекты появления, наведения и покоя. */
export type ButtonAnimate = Omit<SurfaceAnimate, 'change'>;

export interface ButtonProps
    extends Omit<
            React.ButtonHTMLAttributes<HTMLButtonElement>,
            'color' | 'href' | 'target' | 'rel' | 'dir'
        >,
        Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'>,
        LinkPrefetchProps {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<ButtonProps>;
    states?: PresetStates<ButtonProps>;
    /** Появление, hover/idle или их совместная настройка. */
    animate?: ButtonAnimate;
    children?: React.ReactNode;
    /** Жизненный цикл действия или внешний контроллер, подсказка либо меню. */
    ui?: { action?: ActionOptions; popup?: PopupOptions };
    style?: CSSProperties;
    /** Сворачивает кнопку целиком; для ширины укажите `axis: 'column'`. */
    collapse?: CollapseOptions;

    newTab?: boolean;
    nofollow?: boolean;
    noreferrer?: boolean;

    variant?: ResponsiveValue<ButtonVariant>;
    size?: ResponsiveValue<ButtonSize>;

    dir?: ResponsiveValue<
        'row' | 'row-reverse' | 'column' | 'column-reverse' | 'row_reverse' | 'column_reverse'
    >;
    justifyContent?: ResponsiveValue<JustifyContentKey>;
    alignItems?: ResponsiveValue<AlignItemsKey>;

    gap?: ResponsiveValue<number>;
    /** Named theme typography, shared with native Input and Textarea. */
    font?: TextRole | TextVariantName;
    color?: string;
    /** Persistent selection; pressed remains the transient pointer state. */
    active?: boolean;
    state?: ComponentStateValue;

    linkState?: StateLinkInput;

    /** Called exactly once when a click handler settles (not for disabled/reentrant clicks). */
    onActionSettled?: (result: ActionInvocationResult) => void;
    /** Optional diagnostic name surfaced to the app's single failure handler. */
    actionName?: string;
}

/** Named native visual defaults authored by the consumer. */
export type ButtonPresets = PresetMap<ButtonProps>;
