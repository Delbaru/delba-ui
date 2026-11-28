'use client';

import type { CSSProperties, Ref } from 'react';
import { stateLinkProps, type StateLinkInput } from '../component-state';
import { useMergedRefs } from '../useMergedRefs';
import { useSurfaceMotion, type SurfaceMotionOptions } from '../Motion';
import { composeElementEvents, type ElementEventLayer, type ElementEvents } from './Element.events';

export interface ElementOptions<T extends HTMLElement | SVGElement = HTMLElement> {
    ref?: Ref<T>;
    beforeRefs?: readonly (Ref<T> | undefined)[];
    refs?: readonly (Ref<T> | undefined)[];
    motion?: SurfaceMotionOptions;
    style?: CSSProperties;
    tailStyle?: CSSProperties;
    beforeEvents?: ElementEventLayer<T>;
    events?: readonly ElementEventLayer<T>[];
    linkState?: StateLinkInput;
}

export function useElement<T extends HTMLElement | SVGElement = HTMLElement>(options: ElementOptions<T>) {
    const motion = useSurfaceMotion(options.motion ?? {});
    const ref = useMergedRefs<T>(
        ...(options.beforeRefs ?? []),
        motion.setMotionNode,
        ...(options.refs ?? []),
        options.ref,
    );
    const layers: ElementEventLayer<T>[] = [
        ...(options.beforeEvents ? [options.beforeEvents] : []),
        { handlers: (motion.motionHandlers ?? {}) as ElementEvents<T> },
        ...(options.events ?? []),
    ];
    return {
        ref,
        attributes: motion.revealAttrs,
        className: motion.motionClassName,
        effects: motion.effects,
        style: { ...motion.motionStyle, ...options.style, ...options.tailStyle },
        events: stateLinkProps(options.linkState, composeElementEvents(layers) as Parameters<typeof stateLinkProps>[1]) as ElementEvents<T> & { 'data-link-targets'?: string },
    };
}
