'use client';

import { Children, useEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';

import { Flex } from '../Flex';
import { cx, MEDIA_QUERY, type ResponsiveValue } from '../../core';
import { useInView } from '../../core/useInView';
import { useMediaQuery } from '../../hooks/useMediaQuery';

import styles from './Marquee.module.scss';

export type MarqueeProps = Omit<ComponentProps<typeof Flex>, 'ref' | 'as' | 'dir' | 'gap' | 'children'> & {
    children: ReactNode;
    /** Тег каждой копии ленты. `ul` — когда элементы `li`: список читается один раз, копии скрыты. */
    as?: 'div' | 'ul';
    /** Зазор между элементами и между копиями, кортеж `[desktop, mobile, tablet]`. */
    gap?: ResponsiveValue<number>;
    /** Скорость, px в секунду. Лента длиннее — едет столько же пикселей в секунду, а не дольше круг. */
    speed?: number;
    /** Ехать вправо, а не влево. */
    reverse?: boolean;
    /**
     * Остановить движение — это кнопка паузы проекта (WCAG 2.2.2: движение дольше пяти секунд
     * обязано останавливаться). Останавливается плавно, тащить мышью можно и на паузе.
     */
    paused?: boolean;
    /** Тащить ленту мышью и пальцем, с инерцией после броска. */
    draggable?: boolean;
    /** Затухание по краям окна. */
    fade?: boolean;
};

// Постоянная времени, за которую скорость подтягивается к целевой, с. Одна на всё: бросок гаснет,
// пауза тормозит, продолжение разгоняется — по одной и той же экспоненте, без рывков.
const EASE_S = 0.7;
// Длинный кадр (вкладка в фоне, затык главного потока) не должен отбрасывать ленту скачком.
const MAX_DT_S = 0.1;
// Пока палец сдвинулся меньше — это клик по ссылке внутри, а не перетаскивание.
const DRAG_START_PX = 6;
// Скорость броска берётся по последним движениям, а не по всему жесту: остановился и отпустил — не бросил.
const FLING_WINDOW_MS = 100;
const MAX_FLING = 4000;
const IDLE_SPEED = 0.5;
// Страховка от петли «копий больше — окно шире»: окну ширину даёт раскладка (`contain` в модуле),
// но если потребитель её перебьёт, лента остановится на потолке, а не съест кадр.
const MAX_COPIES = 12;

/**
 * Бесконечная лента: содержимое едет по кругу, шва нет. Копии (`aria-hidden`, `inert`) дорисовываются,
 * пока лента не перекроет окно с запасом на круг, — поэтому бесшовна и короткая лента.
 *
 * Едет трансформом по `requestAnimationFrame`, а не CSS-анимацией: так скорость ведёт одна величина,
 * и бросок, торможение на паузе и разгон — одна физика. Встаёт, пока наведена мышь или фокус внутри,
 * и когда лента за экраном — кадры не крутятся впустую.
 *
 * «Меньше движения»: копии скрыты, лента переносится в строки и стоит — это делает CSS, до гидрации.
 *
 * Все остальные пропсы — пропсы `Flex` окна: поля, размеры, рамка, фон.
 */
export function Marquee({
    children,
    as = 'div',
    gap,
    speed = 40,
    reverse = false,
    paused = false,
    draggable = true,
    fade = false,
    className,
    ...props
}: MarqueeProps): ReactElement {
    const rootRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLElement>(null);
    const [copies, setCopies] = useState(2);
    const reduced = useMediaQuery(MEDIA_QUERY.reducedMotion);
    const { isInView } = useInView(rootRef);

    const live = useRef({ speed, reverse, paused, isInView, wake: () => {} });
    live.current.speed = speed;
    live.current.reverse = reverse;
    live.current.paused = paused;
    live.current.isInView = isInView;

    useEffect(() => live.current.wake(), [speed, reverse, paused, isInView]);

    useEffect(() => {
        const root = rootRef.current;
        const track = trackRef.current;
        if (!root || !track || reduced) return;

        let offset = 0;
        let velocity = 0;
        let period = 0;
        let raf = 0;
        let last = 0;
        let hover = false;
        let focus = false;
        const drag = { id: -1, pending: false, active: false, x: 0, from: 0, moved: false, samples: [] as { t: number; x: number }[] };

        const measure = () => {
            const [first, second] = Array.from(track.children) as HTMLElement[];
            if (!first || !second) return;
            period = second.offsetLeft - first.offsetLeft;
            if (period > 0) setCopies(Math.min(MAX_COPIES, Math.max(2, Math.ceil(root.clientWidth / period) + 1)));
        };

        const place = () => {
            if (period > 0) offset = ((offset % period) + period) % period;
            track.style.transform = `translate3d(${-offset}px, 0, 0)`;
        };

        const target = () => {
            const { speed: s, reverse: r, paused: p } = live.current;
            return p || hover || focus ? 0 : r ? -s : s;
        };

        const frame = (now: number) => {
            const dt = Math.min((now - last) / 1000, MAX_DT_S);
            last = now;
            const goal = target();

            if (!drag.active) {
                velocity += (goal - velocity) * (1 - Math.exp(-dt / EASE_S));
                offset += velocity * dt;
            }

            place();

            const idle = !drag.active && goal === 0 && Math.abs(velocity) < IDLE_SPEED;
            if (idle) velocity = 0;
            raf = idle || !live.current.isInView ? 0 : requestAnimationFrame(frame);
        };

        const wake = () => {
            if (raf || !live.current.isInView) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        };
        live.current.wake = wake;

        const onPointerDown = (e: PointerEvent) => {
            if (!draggable || e.button !== 0) return;
            Object.assign(drag, { id: e.pointerId, pending: true, active: false, x: e.clientX, from: offset, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] });
        };

        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerId !== drag.id || !drag.pending) return;
            const dx = e.clientX - drag.x;

            if (!drag.active) {
                if (Math.abs(dx) < DRAG_START_PX) return;
                drag.active = true;
                drag.moved = true;
                velocity = 0;
                root.setPointerCapture(e.pointerId);
                root.setAttribute('state', 'dragging');
                wake();
            }

            offset = drag.from - dx;
            drag.samples.push({ t: e.timeStamp, x: e.clientX });
            while (drag.samples.length > 2 && e.timeStamp - (drag.samples[0]?.t ?? 0) > FLING_WINDOW_MS) drag.samples.shift();
        };

        const onPointerUp = (e: PointerEvent) => {
            if (e.pointerId !== drag.id) return;
            const [first] = drag.samples;
            const lastSample = drag.samples[drag.samples.length - 1];

            if (drag.active && first && lastSample && lastSample.t > first.t && e.timeStamp - lastSample.t < FLING_WINDOW_MS) {
                const fling = -((lastSample.x - first.x) / (lastSample.t - first.t)) * 1000;
                velocity = Math.max(-MAX_FLING, Math.min(MAX_FLING, fling));
            }

            if (drag.active) root.removeAttribute('state');
            Object.assign(drag, { id: -1, pending: false, active: false });
            wake();
        };

        // Клик, которым закончилось перетаскивание, — не клик по ссылке внутри.
        const onClick = (e: MouseEvent) => {
            if (!drag.moved) return;
            drag.moved = false;
            e.preventDefault();
            e.stopPropagation();
        };

        const onEnter = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') hover = true;
        };
        const onLeave = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            hover = false;
            wake();
        };
        const onFocusIn = () => {
            focus = true;
        };
        const onFocusOut = (e: FocusEvent) => {
            if (e.relatedTarget instanceof Node && root.contains(e.relatedTarget)) return;
            focus = false;
            wake();
        };
        const onDragStart = (e: DragEvent) => e.preventDefault();

        const listeners = [
            ['pointerdown', onPointerDown],
            ['pointermove', onPointerMove],
            ['pointerup', onPointerUp],
            ['pointercancel', onPointerUp],
            ['pointerenter', onEnter],
            ['pointerleave', onLeave],
            ['focusin', onFocusIn],
            ['focusout', onFocusOut],
            ['dragstart', onDragStart],
        ] as const;
        for (const [type, fn] of listeners) root.addEventListener(type, fn as EventListener);
        root.addEventListener('click', onClick, true);

        const observer = new ResizeObserver(() => {
            measure();
            place();
        });
        observer.observe(root);
        observer.observe(track);
        measure();
        wake();

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            for (const [type, fn] of listeners) root.removeEventListener(type, fn as EventListener);
            root.removeEventListener('click', onClick, true);
            root.removeAttribute('state');
            track.style.transform = '';
            live.current.wake = () => {};
        };
    }, [reduced, draggable]);

    const items = Children.toArray(children);

    return (
        <Flex
            ref={rootRef}
            className={cx(styles.Marquee, className)}
            data-fade={fade || undefined}
            data-draggable={draggable || undefined}
            minW={[0, 0, 0]}
            {...props}
        >
            <Flex ref={trackRef} gap={gap} w={['max-content', 'max-content', 'max-content']} className={styles.track}>
                {Array.from({ length: copies }, (_, i) => (
                    <Flex
                        key={i}
                        as={as}
                        gap={gap}
                        m={[0, 0, 0]}
                        p={[0, 0, 0]}
                        className={styles.copy}
                        aria-hidden={i > 0 || undefined}
                        inert={i > 0 || undefined}
                    >
                        {items}
                    </Flex>
                ))}
            </Flex>
        </Flex>
    );
}
