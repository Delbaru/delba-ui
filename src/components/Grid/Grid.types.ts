import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { BoxLayoutProps, ContainerProp, ResponsiveValue, StateLinkInput } from '#core';
import type { RevealScopeProps } from '../../core/reveal/reveal';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { MotionTime } from '../../core/base/timing';
import type { MotionDistance } from '../../core/base/distance';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { GridItemLayout } from './GridItem';

export type Track =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52;

type JustifyItemsKey = 'start' | 'end' | 'center' | 'stretch';
type AlignItemsKey = 'start' | 'end' | 'center' | 'stretch';

type AlignContentKey =
    | 'start'
    | 'end'
    | 'center'
    | 'stretch'
    | 'space_between'
    | 'space_around'
    | 'space_evenly';
type AutoFlowKey = 'row' | 'column' | 'dense' | 'row_dense' | 'column_dense';

export interface GridProps
    extends React.HTMLAttributes<HTMLDivElement>,
        BoxLayoutProps,
        ContainerProp,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'>,
        RevealScopeProps {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<GridProps>;
    states?: PresetStates<GridProps>;
    children?: React.ReactNode;
    /** Перестроение по стабильным ключам прямых GridItem. */
    animate?: MotionChannels<{ change: GridLayoutAnimate }>;
    /** Сворачивает весь Grid по высоте; `open` управляется состоянием снаружи. */
    collapse?: CollapseOptions;

    columns?: ResponsiveValue<Track>;
    rows?: ResponsiveValue<Track>;
    gap?: ResponsiveValue<number>;
    rowGap?: ResponsiveValue<number>;
    columnGap?: ResponsiveValue<number>;

    justifyItems?: ResponsiveValue<JustifyItemsKey>;
    alignItems?: ResponsiveValue<AlignItemsKey>;
    alignContent?: ResponsiveValue<AlignContentKey>;
    autoFlow?: ResponsiveValue<AutoFlowKey>;

    areas?: string[];
    items?: Array<GridItemLayout>;
    renderItem?: (item: GridItemLayout, index: number) => React.ReactNode;

    linkState?: StateLinkInput;
}

export interface GridLayoutAnimate {
    /** Сохраняет DOM оставшихся элементов, а вход и выход запускает для изменившихся. */
    effect: 'layout';
    /** Длительность входа, выхода и перемещения. */
    duration?: MotionTime;
    /** Сдвиг при входе и выходе. Перемещение вычисляется из геометрии. */
    distance?: MotionDistance;
    /** Интервал появления новых элементов. */
    stagger?: MotionTime;
}

/** Named native visual defaults authored by the consumer. */
export type GridPresets = PresetMap<GridProps>;
