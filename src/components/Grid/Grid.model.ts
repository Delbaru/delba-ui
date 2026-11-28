'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useRef } from 'react';
import {
    boxLayout,
    containerClass,
    createLayoutClasses,
    cx,
    splitBoxLayout,
    type WithRef,
} from '#core';
import { useElement } from '#core/Element';
import type { GridProps } from './Grid.types';
import styles from './Grid.module.scss';

const c = createLayoutClasses();

export function useGrid(input: WithRef<GridProps, HTMLDivElement>) {
    const {
        ref,
        children,
        collapse,
        className,
        style,
        columns,
        rows,
        gap,
        rowGap,
        columnGap,
        perspective3d,
        parallax,
        animate,
        justifyItems,
        alignItems,
        alignContent,
        autoFlow,
        areas,
        items,
        renderItem,
        container,
        linkState,
        ...props
    } = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const hostRef = useRef<HTMLDivElement>(null);
    const element = useElement({
        ref,
        refs: [hostRef],
        motion: { perspective3d, parallax, animate },
        style: { gridTemplateAreas: areas?.map((row) => `"${row}"`).join(' '), ...style },
        linkState,
        events: [{ handlers: rest }],
    });
    const change = animate?.change;

    return {
        root: {
            ref: element.ref,
            className: cx(
                styles.Grid,
                element.className,
                change && styles.Layout,
                containerClass(container),
                ...boxLayout(c, box),
                ...c.value('columns', columns),
                ...c.value('rows', rows),
                ...c.value('gap', gap),
                ...c.value('rowGap', rowGap),
                ...c.value('columnGap', columnGap),
                ...c.value('justifyItems', justifyItems),
                ...c.value('align', alignItems),
                ...c.value('alignContent', alignContent),
                ...c.value('autoFlow', autoFlow),
                className,
            ),
            style: element.style,
            'data-ui-collapse-layout': '',
            ...element.attributes,
            ...rest,
            ...element.events,
        },
        effects: element.effects,
        collapse: collapse && { ...collapse, clip: box.minH != null },
        layout: change && {
            host: hostRef,
            options: change,
            layoutKey: JSON.stringify([columns, rows, gap, rowGap, columnGap, areas, className]),
        },
        children,
        items,
        renderItem,
    };
}
