import { isValidElement, type ReactNode } from 'react';

import type { ButtonProps } from '../Button';

export type AccordionItemTriggerButtonProps = Omit<
    ButtonProps,
    'id' | 'children' | 'content' | 'onClick' | 'disabled' | 'aria-expanded' | 'aria-controls' | 'href'
>;

export type AccordionItemTriggerOptions = AccordionItemTriggerButtonProps & {
    /** Содержимое кнопки-триггера. */
    content: ReactNode;
};

/** Не трактуем составные ReactNode как настройки триггера. */
export function isAccordionItemTriggerOptions(value: ReactNode | AccordionItemTriggerOptions): value is AccordionItemTriggerOptions {
    if (value === null || typeof value !== 'object' || Array.isArray(value) || isValidElement(value)) return false;

    const candidate = value as object & { $$typeof?: symbol; then?: unknown; [Symbol.iterator]?: unknown };
    if (candidate.$$typeof === Symbol.for('react.portal')) return false;
    if (typeof candidate.then === 'function' || typeof candidate[Symbol.iterator] === 'function') return false;

    return Object.prototype.hasOwnProperty.call(candidate, 'content');
}

export function resolveAccordionItemTrigger(trigger: ReactNode | AccordionItemTriggerOptions): {
    content: ReactNode;
    props: AccordionItemTriggerButtonProps;
} {
    if (!isAccordionItemTriggerOptions(trigger)) return { content: trigger, props: {} };

    const { content, ...props } = trigger;
    return { content, props };
}
