'use client';

import { createContext, useContext, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

import styles from './Crossfade.module.scss';

import { boxLayout, createLayoutClasses, cx, MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs, splitBoxLayout, stateProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type WithRef } from '../../core';

/** Как входящий сменяет прежний: `fade` — кроссфейд, `zoom` — проявление с лёгким масштабом,
 *  `reveal` — клип снизу вверх поверх прежнего с лёгким масштабом. */
export type CrossfadeEffect = 'fade' | 'zoom' | 'reveal';

/** Длительность смены — токен темы `--t-d-<имя>`. */
export type CrossfadeDuration = 'fast' | 'normal' | 'slow';

const c = createLayoutClasses();
const ITEM = 'data-crossfade';

interface CrossfadeContextValue {
    active: string | null;
    leaving: string | null;
}

const CrossfadeContext = createContext<CrossfadeContextValue | null>(null);

export interface CrossfadeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, BoxLayoutProps {
    /** Ключ видимого пункта (`value` у `CrossfadeItem`); `null` — не виден ни один. */
    value: string | null;
    /** Пункты `CrossfadeItem`: все в DOM, в одной ячейке, видно один. */
    children?: ReactNode;
    /** Эффект смены; по умолчанию `fade`. */
    effect?: CrossfadeEffect;
    /** Длительность смены — токен `--t-d-fast|normal|slow`; по умолчанию `normal`. */
    duration?: CrossfadeDuration;
    /** Состояния корня (`[state~='…']`), склеиваются как у остальных компонентов кита. */
    state?: ComponentStateValue;
}

/**
 * Смена содержимого на месте: пункты стопкой в одной ячейке грида, видно активный, смена — анимацией.
 * Ячейку задаёт самый крупный пункт, поэтому смена не двигает раскладку. Все пункты в DOM (картинки
 * загружены заранее); неактивные — `aria-hidden` и `inert`. Первый кадр без анимации, «меньше
 * движения» — мгновенная смена. Пункт несёт `state`: `active` — видимый, `leaving` — уходящий,
 * пока входящий проявляется поверх.
 *
 * Эффекты `zoom` и `reveal` масштабируют содержимое пункта и режут его по рамке пункта — тень и
 * кольцо фокуса ребёнка, выходящие за рамку, в них срежутся; им место на корне.
 */
export function Crossfade({ ref, value, children, effect = 'fade', duration = 'normal', state, className, ...props }: WithRef<CrossfadeProps, HTMLDivElement>) {
    const { box, rest } = splitBoxLayout(props);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, ref);
    const [active, setActive] = useState(value);
    const [leaving, setLeaving] = useState<string | null>(null);

    // Смена ключа — поправка состояния прямо в рендере: прежний пункт получает `leaving` в том же
    // коммите, где новый становится активным, и ни кадра не стоит спрятанным.
    if (value !== active) {
        setLeaving(active);
        setActive(value);
    }

    // Уходящий прячем, когда входящий доехал: длительность — его переход, плюс общий запас.
    useEffect(() => {
        if (leaving === null) return undefined;
        const root = rootRef.current;
        const node = root && active !== null ? root.querySelector<HTMLElement>(`:scope > [${ITEM}="${CSS.escape(active)}"]`) : null;
        const ms = node && !prefersReducedMotion() ? readMotionMs(node) + MOTION_END_BUFFER_MS : 0;
        const timer = window.setTimeout(() => setLeaving(null), ms);
        return () => window.clearTimeout(timer);
    }, [active, leaving]);

    return (
        <CrossfadeContext.Provider value={{ active, leaving }}>
            <div
                ref={setRefs}
                {...rest}
                className={cx(styles.Crossfade, ...boxLayout(c, box), className)}
                data-effect={effect}
                data-duration={duration}
                {...stateProps(state)}
            >
                {children}
            </div>
        </CrossfadeContext.Provider>
    );
}

export interface CrossfadeItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Ключ пункта: им пункт значится в `value` родителя. Уникален в пределах `Crossfade`. */
    value: string;
    /** Содержимое: картинка, карточка, превью. */
    children?: ReactNode;
    /** Свои состояния пункта; склеиваются с `active`/`leaving`, которые ставит кит. */
    state?: ComponentStateValue;
}

/** Пункт `Crossfade`. Живёт только прямым ребёнком `Crossfade`. */
export function CrossfadeItem({ ref, value, children, state, className, ...props }: WithRef<CrossfadeItemProps, HTMLDivElement>) {
    const ctx = useContext(CrossfadeContext);
    if (!ctx) throw new Error('CrossfadeItem живёт только внутри Crossfade');

    const shown = ctx.active === value;
    const own = shown ? 'active' : ctx.leaving === value ? 'leaving' : undefined;

    return (
        <div
            ref={ref}
            {...props}
            className={cx(styles.item, className)}
            {...{ [ITEM]: value }}
            {...stateProps(own, state)}
            aria-hidden={shown ? undefined : true}
            inert={!shown}
        >
            <div className={styles.inner}>{children}</div>
        </div>
    );
}
