import type { DOMAttributes, EventHandler, SyntheticEvent } from 'react';
import { composeEventHandlers } from '../composeEventHandlers';

export type ElementEvents<T extends Element = HTMLElement> = Omit<DOMAttributes<T>, 'children' | 'dangerouslySetInnerHTML'>;
type Handler<T extends Element = HTMLElement> = EventHandler<SyntheticEvent<T>>;

export interface ElementEventLayer<T extends Element = HTMLElement> {
    handlers: ElementEvents<T>;
    cancelable?: boolean | readonly (keyof ElementEvents<T>)[];
}

export function splitElementEvents<Props extends object>(props: Props) {
    const attributes: Record<string, unknown> = {};
    const handlers: Record<string, Handler> = {};
    for (const [name, value] of Object.entries(props)) {
        if (/^on[A-Z]/.test(name) && typeof value === 'function') handlers[name] = value as Handler;
        else attributes[name] = value;
    }
    return { attributes: attributes as Omit<Props, keyof ElementEvents>, handlers: handlers as ElementEvents };
}

export function composeElementEvents<T extends Element = HTMLElement>(layers: readonly ElementEventLayer<T>[]): ElementEvents<T> {
    const result: Record<string, Handler<T> | undefined> = {};
    for (const layer of layers) {
        for (const [name, value] of Object.entries(layer.handlers)) {
            if (typeof value !== 'function') continue;
            const cancelable = layer.cancelable === true
                || Array.isArray(layer.cancelable) && layer.cancelable.includes(name);
            result[name] = composeEventHandlers(result[name], value as Handler<T>, { cancelable });
        }
    }
    return result;
}

