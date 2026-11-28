'use client';

import type { WithRef } from '#core';
import type { ScrollOptions } from '#core/Scroll';
import { Flex } from '../Flex';
import { DEFAULT_SCROLL_AXIS } from './ScrollArea.config';
import type { ScrollAreaProps } from './ScrollArea.types';

/** Сам узел прокрутки: ref и DOM-события относятся к viewport. Заголовок и footer размещаются снаружи. */
export function ScrollArea({
    axis = DEFAULT_SCROLL_AXIS, fade = false, scrollbar, ui, ...props
}: WithRef<ScrollAreaProps, HTMLDivElement>) {
    const scroll: ScrollOptions = ui?.scroll ?? { preset: 'default' as const, axis, fade };
    const settings = scroll.preset === 'smooth' && scroll.target === 'window'
        ? scroll
        : { ...scroll, scrollbar: scrollbar ?? scroll.scrollbar };
    return <Flex {...props} ui={{ ...ui, scroll: settings }} />;
}
