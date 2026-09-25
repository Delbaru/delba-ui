'use client';

import { createContext, useContext, useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import styles from './Accordion.module.scss';

import { Button, type ButtonProps } from '../Button';
import { Flex, type FlexProps } from '../Flex';
import { cx, mergeComponentStates, type WithRef } from '../../core';

/** Уровень заголовка-обёртки триггера. */
export type AccordionHeading = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// Сворачивание, ссылка и своп принадлежат самому аккордеону — снаружи их не пробросить.
type ShellOmit =
  | 'children' | 'defaultValue'
  | 'collapse' | 'collapseGap' | 'collapseFade' | 'collapseAxis' | 'collapseAppear' | 'collapseOverflowVisible'
  | 'collapseKeepMounted' | 'onCollapseEnd' | 'onCollapseFound'
  | 'href' | 'target' | 'rel' | 'download' | 'newTab' | 'nofollow' | 'noreferrer' | 'linkState' | 'transitionKey';

type AccordionShellProps = Omit<FlexProps, ShellOmit> & {
    children?: ReactNode;
    /** Иконка-индикатор для всех пунктов (плюс, стрелка): встаёт в триггер справа, `aria-hidden`.
     *  Поворот и цвет — у проекта по `[state~='open']`. Пункт перебивает своим `indicator`. */
    indicator?: ReactNode;
    /** Уровень заголовка над триггером для всех пунктов; по умолчанию `h3`. Пункт перебивает. */
    headingAs?: AccordionHeading;
};

export type AccordionSingleProps = AccordionShellProps & {
    /** Несколько открытых пунктов сразу. Без него открыт максимум один. */
    multiple?: false;
    /** Открытый пункт (управляемый режим); `null` — все закрыты. */
    value?: string | null;
    /** Открытый пункт на старте (неуправляемый режим). */
    defaultValue?: string | null;
    /** Пункт открыли или закрыли; `null` — закрыт последний. */
    onValueChange?: (value: string | null) => void;
    /** Можно закрыть единственный открытый пункт повторным нажатием. По умолчанию `true`. */
    collapsible?: boolean;
};

export type AccordionMultipleProps = AccordionShellProps & {
    /** Несколько открытых пунктов сразу: значение — массив. */
    multiple: true;
    /** Открытые пункты (управляемый режим). */
    value?: readonly string[];
    /** Открытые пункты на старте (неуправляемый режим). */
    defaultValue?: readonly string[];
    /** Новый набор открытых пунктов. */
    onValueChange?: (value: string[]) => void;
    /** В режиме `multiple` любой пункт закрывается всегда — проп ни на что не влияет. */
    collapsible?: boolean;
};

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

interface AccordionContextValue {
    rootId: string;
    isOpen: (value: string) => boolean;
    toggle: (value: string) => void;
    reveal: (value: string) => void;
    indicator: ReactNode;
    headingAs: AccordionHeading;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const toList = (value: string | null | readonly string[] | undefined): readonly string[] =>
    value == null ? [] : typeof value === 'string' ? [value] : value;

const TRIGGER = 'data-accordion-trigger';

// Открытый пункт выше схлопывается — нажатый триггер уезжает вверх. Пока в аккордеоне идут переходы,
// не даём ему уйти под шапку (`scroll-padding-top`) и за верх экрана; в остальном окно не трогаем —
// иначе страница прокручивается на каждый клик. Свой скролл пользователя удержание отменяет.
const HOLD_MAX_MS = 2000;

function holdPosition(el: HTMLElement, root: HTMLElement | null) {
    const floor = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const until = performance.now() + HOLD_MAX_MS;
    let frame = 0;
    let settled = 0;
    const stop = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('wheel', stop);
        window.removeEventListener('touchstart', stop);
    };
    const tick = () => {
        const shift = Math.min(el.getBoundingClientRect().top - floor, 0);
        // `instant`: при `scroll-behavior: smooth` каждый кадр перезапускал бы плавный перелёт.
        if (Math.abs(shift) >= 1) window.scrollBy({ top: shift, behavior: 'instant' });
        const moving = (root?.getAnimations({ subtree: true }).length ?? 0) > 0;
        settled = moving || Math.abs(shift) >= 1 ? 0 : settled + 1;
        if (settled < 3 && performance.now() < until) frame = requestAnimationFrame(tick);
        else stop();
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    frame = requestAnimationFrame(tick);
}

/**
 * Аккордеон по WAI-ARIA: заголовок с кнопкой-триггером и панель-регион на пункт, ↑/↓/Home/End между
 * триггерами. Закрытые панели остаются в DOM под `hidden="until-found"` — текст видят поисковики и
 * Ctrl+F; найденный браузером пункт раскрывается сам. Кит даёт поведение, доступность и анимацию;
 * разделители, иконку, цвета и кольцо фокуса задаёт проект — классами и `[state~='open']`.
 */
export function Accordion(props: WithRef<AccordionProps, HTMLElement>) {
    // Колбэк зовём через `props`: так TS сужает union по `multiple`, у деструктуры сужения нет.
    const { ref, className, multiple, value, defaultValue, onValueChange: _onValueChange, collapsible, indicator, headingAs = 'h3', ...rest } = props;
    const rootId = useId();
    const [inner, setInner] = useState<readonly string[]>(() => toList(defaultValue));
    const controlled = value !== undefined;
    const openList = controlled ? toList(value) : inner;

    const commit = (next: readonly string[]) => {
        if (!controlled) setInner(next);
        if (props.multiple) props.onValueChange?.([...next]);
        else props.onValueChange?.(next[0] ?? null);
    };

    const isOpen = (item: string) => openList.includes(item);

    const toggle = (item: string) => {
        if (isOpen(item)) {
            if (multiple) commit(openList.filter((v) => v !== item));
            else if (collapsible ?? true) commit([]);
        } else {
            commit(multiple ? [...openList, item] : [item]);
        }
    };

    const reveal = (item: string) => {
        if (!isOpen(item)) toggle(item);
    };

    // Триггеры ищем по id своего корня: у вложенного аккордеона он другой, и его стрелки сюда не доходят.
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        rest.onKeyDown?.(event);
        const target = event.target as HTMLElement;
        if (event.defaultPrevented || target.getAttribute(TRIGGER) !== rootId) return;

        const triggers = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(`[${TRIGGER}="${CSS.escape(rootId)}"]:not(:disabled)`));
        const index = triggers.indexOf(target);
        const last = triggers.length - 1;
        const moves: Record<string, number> = {
            ArrowDown: index >= last ? 0 : index + 1,
            ArrowUp: index <= 0 ? last : index - 1,
            Home: 0,
            End: last,
        };
        const nextIndex = moves[event.key];
        if (nextIndex === undefined) return;

        event.preventDefault();
        triggers[nextIndex]?.focus();
    };

    return (
        <AccordionContext.Provider value={{ rootId, isOpen, toggle, reveal, indicator, headingAs }}>
            <Flex ref={ref} {...rest} className={cx(styles.Accordion, className)} data-accordion={rootId} onKeyDown={onKeyDown} />
        </AccordionContext.Provider>
    );
}

export interface AccordionItemProps extends Omit<FlexProps, ShellOmit> {
    /** Ключ пункта: им пункт значится в `value` аккордеона. Уникален в пределах аккордеона. */
    value: string;
    /** Содержимое кнопки-триггера (подпись): обычно `<Text>`. */
    trigger: ReactNode;
    /** Содержимое панели. */
    children?: ReactNode;
    /** Уровень заголовка над триггером; по умолчанию — `headingAs` аккордеона. */
    headingAs?: AccordionHeading;
    /** Иконка-индикатор этого пункта; по умолчанию — `indicator` аккордеона. `null` — без иконки. */
    indicator?: ReactNode;
    /** Пункт не раскрывается и пропускается стрелками. */
    disabled?: boolean;
    /** Пропсы кнопки-триггера: отступы, зазор, шкура проекта. aria и обработчик ставит кит. */
    triggerProps?: Omit<ButtonProps, 'id' | 'children' | 'onClick' | 'disabled' | 'aria-expanded' | 'aria-controls' | 'href'>;
    /** Пропсы панели (раскладка, отступы содержимого). Сворачивание и роль ставит кит. */
    panelProps?: Omit<FlexProps, ShellOmit | 'id' | 'role' | 'aria-labelledby'>;
}

/**
 * Пункт аккордеона. Открытый получает токен `open` в `state` пункта, триггера и панели; индикатор
 * стилизуется через триггер (`[state~='open'] > …`). Свой `state` пункта и `triggerProps.state` склеиваются с ним.
 */
export function AccordionItem({
    ref,
    value,
    trigger,
    children,
    headingAs,
    indicator,
    disabled,
    triggerProps,
    panelProps,
    className,
    ...props
}: WithRef<AccordionItemProps, HTMLElement>) {
    const ctx = useContext(AccordionContext);
    const baseId = useId();
    if (!ctx) throw new Error('AccordionItem живёт только внутри Accordion');

    const open = ctx.isOpen(value);
    const state = open ? 'open' : undefined;
    const Heading = headingAs ?? ctx.headingAs;
    const icon = indicator === undefined ? ctx.indicator : indicator;
    const triggerId = `${baseId}-trigger`;
    const panelId = `${baseId}-panel`;

    return (
        <Flex ref={ref} {...props} className={cx(styles.item, className)} state={mergeComponentStates(state, props.state)} data-disabled={disabled || undefined}>
            <Heading className={styles.heading}>
                <Button
                    {...triggerProps}
                    className={cx(styles.trigger, triggerProps?.className)}
                    id={triggerId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    disabled={disabled}
                    state={mergeComponentStates(state, triggerProps?.state)}
                    data-accordion-trigger={ctx.rootId}
                    onClick={(event) => {
                        ctx.toggle(value);
                        holdPosition(event.currentTarget, event.currentTarget.closest<HTMLElement>(`[data-accordion="${CSS.escape(ctx.rootId)}"]`));
                    }}
                >
                    <span className={styles.label}>{trigger}</span>
                    {icon != null && <span aria-hidden className={styles.indicator}>{icon}</span>}
                </Button>
            </Heading>
            <Flex
                {...panelProps}
                className={cx(styles.panel, panelProps?.className)}
                id={panelId}
                role='region'
                aria-labelledby={triggerId}
                state={mergeComponentStates(state, panelProps?.state)}
                collapse={open}
                collapseFade
                collapseKeepMounted
                onCollapseFound={() => ctx.reveal(value)}
            >
                {children}
            </Flex>
        </Flex>
    );
}
