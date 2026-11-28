'use client';

import { resolvePresetProps } from '../../../core/Preset';
import { boxLayout, createLayoutClasses, cx, splitBoxLayout, type WithRef } from '#core';
import { useElement } from '#core/Element';
import type { GridItemProps } from './GridItem.types';
import styles from './GridItem.module.scss';

const c = createLayoutClasses();

export function useGridItem(input: WithRef<GridItemProps, HTMLDivElement>) {
    const {
        ref,
        children,
        className = '',
        style,
        area,
        colSpan,
        rowSpan,
        colStart,
        colEnd,
        rowStart,
        rowEnd,
        perspective3d,
        parallax,
        animate,
        justifyContent,
        alignItems,
        ...props
    } = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const element = useElement({
        ref,
        motion: { perspective3d, parallax, animate },
        style: { gridArea: area, ...style },
        events: [{ handlers: rest }],
    });

    return {
        root: {
            ref: element.ref,
            className: cx(
                (justifyContent !== undefined || alignItems !== undefined) && styles.GridItem,
                element.className,
                ...c.value('colSpan', colSpan),
                ...c.value('rowSpan', rowSpan),
                ...c.value('colStart', colStart),
                ...c.value('colEnd', colEnd),
                ...c.value('rowStart', rowStart),
                ...c.value('rowEnd', rowEnd),
                ...boxLayout(c, box),
                ...c.value('justify', justifyContent),
                ...c.value('align', alignItems),
                className,
            ),
            style: element.style,
            ...element.attributes,
            ...rest,
            ...element.events,
        },
        effects: element.effects,
        children,
    };
}
