/** Цель фокуса: узел или объектный `ref` на него (то, что отдают `Input`, `Textarea` и любой `useRef`). */
export type FocusTarget = HTMLElement | null | undefined | { readonly current: HTMLElement | null };

/** Сохраняет текущий фокус при mousedown на вспомогательном действии. */
export function preserveFocus(event: Pick<Event, 'preventDefault'>): void {
  event.preventDefault();
}

export interface FocusWhenReadyOptions {
  /** Не прокручивать страницу к полю: прокруткой владеет `scrollTo`, а не фокус. По умолчанию `true`. */
  preventScroll?: boolean;
  /** Сколько ждать, пока поле станет фокусируемым, мс. По умолчанию 1000. */
  timeout?: number;
}

const DEFAULT_TIMEOUT_MS = 1000;
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
const BLOCKING_ATTRIBUTES = ['inert', 'hidden', 'disabled', 'class', 'style'];

/** Узел цели: `ref` разворачивается, пустое значение — `null`. */
export function resolveFocusTarget(target: FocusTarget): HTMLElement | null {
  if (!target) return null;

  return 'current' in target ? target.current : target;
}

/**
 * Уступить ли фокус человеку. Пока ждём, он мог сам уйти в ДРУГОЕ поле ввода — тогда чужой фокус
 * не отбираем. Кнопка или пункт меню под курсором полем не считаются: это след клика, который
 * и запустил ожидание (выбор типа вопроса), а не новое намерение печатать в другом месте.
 */
export function shouldYieldFocus(current: Element | null, target: Element, initial: Element | null): boolean {
  if (!current || current === target || current === initial) return false;

  return current.matches(EDITABLE_SELECTOR);
}

/** Фокусируемо ли поле прямо сейчас: в документе, не отключено и не под `inert`/`hidden`. */
function isFocusableNow(element: HTMLElement): boolean {
  return element.isConnected && !element.matches(':disabled') && !element.closest('[inert], [hidden]');
}

/**
 * Поставить фокус, как только поле станет фокусируемым. Обычный `focus()` молча не срабатывает,
 * пока поле внутри свёрнутого `collapse` (там `inert`) или ещё не смонтировано, — этот ждёт снятия
 * `inert`/`hidden`/`disabled` (и смены классов/стилей) и появления узла по `MutationObserver`,
 * без опроса по кадрам.
 *
 * Возвращает `true`, если фокус встал; `false` — по тайм-ауту или если человек сам ушёл в другое поле.
 */
export function focusWhenReady(target: FocusTarget, options: FocusWhenReadyOptions = {}): Promise<boolean> {
  const ownerDocument = resolveFocusTarget(target)?.ownerDocument
    ?? (typeof document === 'undefined' ? undefined : document);
  const view = ownerDocument?.defaultView;
  if (!ownerDocument || !view) return Promise.resolve(false);

  const { preventScroll = true, timeout = DEFAULT_TIMEOUT_MS } = options;
  const initial = ownerDocument.activeElement;

  const attempt = (): boolean | null => {
    const element = resolveFocusTarget(target);

    if (!element) return null;
    if (element.ownerDocument !== ownerDocument) return false;
    if (shouldYieldFocus(element.ownerDocument.activeElement, element, initial)) return false;
    if (!isFocusableNow(element)) return null;

    element.focus({ preventScroll });

    return element.ownerDocument.activeElement === element ? true : null;
  };

  const immediate = attempt();

  if (immediate !== null) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      view.clearTimeout(timer);
      resolve(result);
    };

    const observer = new view.MutationObserver(() => {
      const result = attempt();

      if (result !== null) finish(result);
    });

    observer.observe(ownerDocument.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: BLOCKING_ATTRIBUTES,
    });

    const timer = view.setTimeout(() => finish(attempt() ?? false), timeout);
  });
}
