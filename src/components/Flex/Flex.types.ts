import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { AsyncOptions } from '../../core/Async/Async';
import type { CSSProperties } from 'react';
import type { FormScope } from '#core/Form';
import type { ScrollOptions } from '#core/Scroll';
import type { CollapseDoor } from '../../core/Collapse/Collapse';
import type { CollectionScope, CollectionItem } from '#core/Collection';
import type { DisclosureController } from '#core/Disclosure';
import type {
    BoxLayoutProps,
    ComponentStateValue,
    ContainerProp,
    ResponsiveValue,
    StateLinkInput,
    Transition,
} from '#core';
import type { RevealScopeProps } from '../../core/reveal/reveal';
import type { LinkPrefetchProps } from '../../hooks/useLinkPrefetch';
import type { CollapseHandle } from '../../hooks/useCollapseMotion';
import type { MotionState, SurfaceAnimate, SurfaceMotionOptions } from '#core/Motion';
import type { OpenAnimate } from '../../core/reveal/reveal';
import type { CollapseOptions } from '../Collapse/CollapseWrap';

type DirectionKey =
    | 'row'
    | 'row-reverse'
    | 'row_reverse'
    | 'column'
    | 'column-reverse'
    | 'column_reverse';
type WrapKey = 'nowrap' | 'wrap' | 'wrap_reverse';
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
type FlexCollapseOptions = CollapseOptions;

export type FlexAnimate = Omit<SurfaceAnimate, 'appearance' | 'change'> &
    (
        | { appearance?: SurfaceAnimate['appearance'] | OpenAnimate; change?: never }
        | { appearance?: never; change: NonNullable<SurfaceAnimate['change']> }
    );

export interface FlexProps
    extends Omit<React.HTMLAttributes<HTMLElement>, 'dir' | 'href' | 'target' | 'rel' | 'download'>,
        Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
        BoxLayoutProps,
        ContainerProp,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'>,
        RevealScopeProps,
        LinkPrefetchProps {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<FlexProps>;
    states?: PresetStates<FlexProps>;
    children?: React.ReactNode;
    /** Scope named descendants without adding a DOM node. */
    ui?: {
        popup?: PopupOptions;
        async?: AsyncOptions;
        form?: FormScope;
        collection?: CollectionScope;
        selectable?: CollectionItem;
        scroll?: ScrollOptions;
        collapse?: CollapseDoor;
        disclosure?: DisclosureController;
        motion?: MotionState;
    };
    style?: CSSProperties;
    state?: ComponentStateValue;
    /** Добавляет state="interacting" при указателе, фокусе или открытом дочернем контроле.
     * Порталы Modal/Dropdown учитываются автоматически; без дополнительного DOM-узла. */
    trackInteraction?: boolean;
    /** Активность области: указатель, фокус или открытая дочерняя Modal/Dropdown, включая порталы.
     * Fixed/sticky-панель с top=0 также реагирует на указатель у верхнего края viewport. */
    onInteractionChange?: (active: boolean) => void;
    /** Marks the nearest source for descendant animate hover transforms, including non-link cards. */
    motionScope?: boolean;
    /** Тег узла без `href`: `header`, `nav`, `footer`… */
    as?:
        | 'div'
        | 'span'
        | 'form'
        | 'header'
        | 'nav'
        | 'footer'
        | 'main'
        | 'aside'
        | 'section'
        | 'ul'
        | 'li'
        | 'dl'
        | 'figure'
        | 'figcaption';

    gap?: ResponsiveValue<number>;
    /** Native flow for neutral surfaces; flex remains the default. */
    display?: ResponsiveValue<'flex' | 'inline-flex' | 'block' | 'inline-block' | 'contents'>;
    rowGap?: ResponsiveValue<number>;
    columnGap?: ResponsiveValue<number>;

    /** Сворачивание всего Flex: `collapse={{ open, gap, fade }}`. Прежний boolean сохранён для
     *  совместимости. Состояние держится снаружи; закрытый контент удаляется после анимации. */
    collapse?: boolean | FlexCollapseOptions;
    /** Верхний отступ сворачиваемого блока (дизайн-единицы, responsive — [d, m, t]).
     *  Анимируется вместе с высотой, поэтому заменяет родительский gap. Работает с collapse. */
    collapseGap?: ResponsiveValue<number>;
    /** Колбэк по завершении анимации сворачивания/раскрытия. Нужен потребителям, которым важен момент
     *  «анимация завершилась» (доизмерение SVG-коннекторов, скролл/фокус после раскрытия). Прерванный
     *  ход его НЕ зовёт. Аргумента больше нет (ход идёт не на CSS-переходе). Работает с collapse. */
    onCollapseEnd?: (event?: React.TransitionEvent<HTMLDivElement>) => void;
    /** Плавное затухание содержимого (opacity 0↔1) синхронно с высотой. Работает с collapse. */
    collapseFade?: boolean;
    /** После завершения раскрытия снять overflow:hidden с клипа (для выпадающих меню/дропдаунов
     *  внутри сворачиваемого блока). Во время анимации overflow остаётся скрытым. Работает с collapse. */
    collapseOverflowVisible?: boolean;
    /** Узел, ПОЯВИВШИЙСЯ от действия (новая строка списка), выезжает вместо появления кадром.
     *  Опт-ин: иначе первый кадр списка стал бы парадом раскрытий. Читается при монтировании. */
    collapseAppear?: boolean;
    /** Ось сворачивания: 'row' — по высоте (по умолчанию), 'column' — по ширине. collapseGap при этом
     *  анимирует padding-left вместо padding-top. Работает с collapse. */
    collapseAxis?: 'row' | 'column';
    /** Ручка сворачивания: `ref.current.transition` — ход, который вызвала последняя смена collapse.
     *  Нужна сценарию, которому важно дождаться хода (`await ref.current.transition`) или собрать его
     *  с чужими через `motion.together`. Узлом ручка НЕ командует: открыто/закрыто решает состояние. */
    collapseRef?: React.Ref<CollapseHandle>;
    /** Тот же ход, но колбэком — когда ручку некуда положить. Зовётся в момент старта. */
    onTransition?: (transition: Transition) => void;
    /** Закрытый блок ОСТАЁТСЯ в DOM (опт-ин): после сворачивания обёртка получает `hidden="until-found"` —
     *  текст видят поисковики и Ctrl+F, а браузер, найдя в нём совпадение, шлёт `beforematch`
     *  (см. onCollapseFound). Где `until-found` нет — обычный `hidden` + `inert`. Работает с collapse. */
    collapseKeepMounted?: boolean;
    /** Браузер нашёл текст в закрытом блоке (поиск по странице, переход по `#:~:text=`): владелец
     *  состояния ставит collapse={true}. Блок раскрывается сразу, без анимации, — иначе браузер
     *  прокрутил бы к ещё нулевой высоте. Работает с collapse и collapseKeepMounted. */
    onCollapseFound?: () => void;

    /** Appearance or keyed content change, combined with independent hover/idle. */
    animate?: FlexAnimate;

    dir?: ResponsiveValue<DirectionKey>;
    justify?: ResponsiveValue<JustifyContentKey>;
    align?: ResponsiveValue<AlignItemsKey>;
    wrap?: ResponsiveValue<WrapKey>;

    /** Scroll edge fade; true selects the vertical axis. */
    scrollFade?: boolean | 'x' | 'y';

    linkState?: StateLinkInput;
    newTab?: boolean;
    nofollow?: boolean;
    noreferrer?: boolean;
}

/** Named native visual defaults authored by the consumer. */
export type FlexPresets = PresetMap<FlexProps>;
