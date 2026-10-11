import type { HTMLAttributes } from 'react';

type Handler<E> = (event: E) => void;

interface Options {
  /** Второй обработчик — действие, которое можно отменить через preventDefault. */
  cancelable?: boolean;
}

export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  first: Handler<E> | undefined,
  second: Handler<E>,
  options?: Options,
): Handler<E>;
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  first: Handler<E> | undefined,
  second: Handler<E> | undefined,
  options?: Options,
): Handler<E> | undefined;
/** Вызывает оба обработчика по порядку. Отменяемое действие включается явно. */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  first: Handler<E> | undefined,
  second: Handler<E> | undefined,
  { cancelable = false }: Options = {},
): Handler<E> | undefined {
  if (!second) return first;
  if (!first && !cancelable) return second;

  return (event) => {
    first?.(event);
    if (!cancelable || !event.defaultPrevented) second(event);
  };
}

type InteractionHandlers<E extends HTMLElement> = Pick<HTMLAttributes<E>,
  'onMouseEnter' | 'onMouseMove' | 'onMouseLeave' | 'onMouseDown' | 'onMouseUp' | 'onClick' | 'onFocus' | 'onBlur'>;

/** Сохраняет пользовательские callbacks при подключении motion и связанных состояний. */
export function composeInteractionHandlers<E extends HTMLElement>(
  internal: InteractionHandlers<E> | undefined,
  user: InteractionHandlers<E>,
): InteractionHandlers<E> {
  return {
    onMouseEnter: composeEventHandlers(internal?.onMouseEnter, user.onMouseEnter),
    onMouseMove: composeEventHandlers(internal?.onMouseMove, user.onMouseMove),
    onMouseLeave: composeEventHandlers(internal?.onMouseLeave, user.onMouseLeave),
    onMouseDown: composeEventHandlers(internal?.onMouseDown, user.onMouseDown),
    onMouseUp: composeEventHandlers(internal?.onMouseUp, user.onMouseUp),
    onClick: composeEventHandlers(internal?.onClick, user.onClick),
    onFocus: composeEventHandlers(internal?.onFocus, user.onFocus),
    onBlur: composeEventHandlers(internal?.onBlur, user.onBlur),
  };
}
