'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useRef, useState } from 'react';
import {
    boxLayout,
    createLayoutClasses,
    cx,
    stateProps,
    splitBoxLayout,
    splitRootDomProps,
    type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import { useFancybox } from '../../hooks/useFancybox';
import { IMG_DEFAULTS } from './Img.config';
import { prepareImage } from './Img.resource';
import type { ImgProps } from './Img.types';
import styles from './Img.module.scss';

const classes = createLayoutClasses();

export function useImg(input: WithRef<ImgProps, HTMLSpanElement>) {
    const props = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const {
        ref,
        id,
        state,
        className,
        style,
        'data-point-events': pointEvents,
        src,
        alt,
        animate,
        objectFit,
        objectPosition,
        rootW,
        rootH,
        sizes,
        sizesWidth,
        sizesHeight,
        blur,
        quality,
        priority,
        loading,
        fetchPriority,
        onLoad,
        onError,
        linkState,
        perspective3d,
        parallax,
        fancybox,
        href,
        target,
        rel,
        download,
        newTab,
        nofollow,
        noreferrer,
        ...native
    } = rest;
    const { rootProps, elementProps } = splitRootDomProps(native);
    const resource = prepareImage(props, box, elementProps);
    const element = useInteractiveElement({
        as: 'span',
        ref,
        root: {
            ...rootProps,
            id,
            ...stateProps(state),
            style,
            href,
            target,
            rel,
            download,
            newTab,
            nofollow,
            noreferrer,
        },
        className: cx(
            styles.Img,
            ...boxLayout(classes, {
                ...box,
                w: rootW ?? box.w,
                h: rootH ?? box.h,
            }),
            className,
        ),
        linkState,
        motion: {
            perspective3d,
            parallax,
            animate: {
                appearance: animate?.appearance && { ...animate.appearance, stagger: 0 },
                hover:
                    animate?.hover && animate.hover.effect === 'transform'
                        ? animate.hover
                        : undefined,
            },
        },
    });
    const group = href ? undefined : fancybox?.trim();
    const lightbox = group
        ? { href: resource.address, group, label: resource.image.alt || 'Изображение' }
        : null;
    useFancybox(Boolean(lightbox?.href));

    const currentIdentity = useRef(resource.identity);
    currentIdentity.current = resource.identity;
    const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
    const imageClassName = cx(
        ...classes.value('objectFit', objectFit ?? IMG_DEFAULTS.objectFit),
        ...classes.value('objectPosition', objectPosition ?? IMG_DEFAULTS.objectPosition),
    );

    return {
        host: element.host,
        resource,
        lightbox,
        blur,
        loaded: loadedIdentity === resource.identity,
        imageClassName,
        change: animate?.change,
        root: { ...element.root, 'data-point-events': pointEvents },
        content: (settled: () => void) => ({
            resource,
            className: imageClassName,
            onLoad(event: Parameters<NonNullable<ImgProps['onLoad']>>[0]) {
                if (currentIdentity.current === resource.identity)
                    setLoadedIdentity(resource.identity);
                settled();
                onLoad?.(event);
            },
            onError(event: Parameters<NonNullable<ImgProps['onError']>>[0]) {
                settled();
                onError?.(event);
            },
        }),
    };
}
