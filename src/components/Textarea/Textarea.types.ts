import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { CSSProperties } from 'react';
import type {
    BoxLayoutProps,
    ComponentStateValue,
    FieldValueChangeHandler,
    ResponsiveValue,
    StateLinkInput,
} from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
type VariantKey = 'primary' | 'secondary';
type SizeKey = 'default' | 'fullWidth';

export interface TextareaProps
    extends Omit<
            React.TextareaHTMLAttributes<HTMLTextAreaElement>,
            | 'color'
            | 'placeholder'
            | 'width'
            | 'minWidth'
            | 'maxWidth'
            | 'height'
            | 'minHeight'
            | 'maxHeight'
        >,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<TextareaProps>;
    states?: PresetStates<TextareaProps>;
    /** Motion channels for the field frame. */
    animate?: MotionChannels;
    style?: CSSProperties;
    /** Оформление нативного textarea; style корня относится ко всему полю. */
    field?: { className?: string; style?: CSSProperties };
    /** Настоящее событие ввода нативного textarea. */
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
    /** Значение модели после ввода или восстановления seed. */
    onValueChange?: FieldValueChangeHandler<HTMLTextAreaElement>;

    variant?: ResponsiveValue<VariantKey>;
    size?: ResponsiveValue<SizeKey>;

    /** Theme typography for the actual field, inherited by the textarea. */
    font?: TextRole | TextVariantName;
    color?: string;

    placeholder?: string;
    placeholderColor?: string;

    seed?: string;

    loading?: boolean;
    label?: string;
    labelColor?: string;
    comment?: string;

    /** Grow to content, keeping rows as the initial height and a 40vh cap. */
    autoGrow?: boolean;
    /** Continue a list on plain Enter; returning null keeps native editing. */
    autoContinue?: (value: string, caret: number) => { value: string; caret: number } | null;
    /** Optional composition content inside the field frame. */
    slots?: { attachments?: React.ReactNode; actions?: React.ReactNode };
    /** Native field and actions flow; column is the default. */
    layout?: 'column' | 'row';
    /** Space between the editable value, attachments and actions. */
    gap?: ResponsiveValue<number>;
    rows?: number;
    length?: { min?: number; max?: number };
    showCount?: boolean;

    countPlacement?: 'inside' | 'below';

    error?: string;
    errorPlacement?: 'inside' | 'below';

    /** Сворачивать поле целиком, включая подпись, ошибку и комментарий. */
    collapse?: CollapseOptions;

    state?: ComponentStateValue;

    required?: boolean;
    emptyMessage?: string;
    validate?: (value: string) => string | undefined;

    linkState?: StateLinkInput;
    'data-point-events'?: string;

    /** Класс на САМО поле (внутренний .Textarea — тот, что несёт фон/рамку), а не на обёртку
     *  с label/comment, куда садится className. Нужен скин-обёрткам (SharedTextarea), которые
     *  красят поле осями из components/system/_axes.scss: без этого класс-ось приземлился бы
     *  на обёртку и покрасил бы заодно подпись. */
    fieldClassName?: string;
}

/** Named native visual defaults authored by the consumer. */
export type TextareaPresets = PresetMap<TextareaProps>;
