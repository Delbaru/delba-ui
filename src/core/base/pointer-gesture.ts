/** Shared pointer lifecycle only. Docking, status, ACL, order and persistence stay with consumers. */
export type PointerGestureEndReason =
  | 'up' | 'pointercancel' | 'lostcapture' | 'escape' | 'blur' | 'hidden' | 'dispose';

export interface PointerGestureStart {
  currentTarget: HTMLElement;
  button: number;
  pointerId: number;
  clientX: number;
  clientY: number;
  isPrimary?: boolean;
}

export interface PointerGestureResult {
  reason: PointerGestureEndReason;
  started: boolean;
  clientX: number;
  clientY: number;
}

export interface PointerGestureOptions {
  /** Activates strictly beyond this CSS-pixel threshold. Defaults to zero. */
  threshold?: number;
  /** Prevent selection only once the gesture is active. */
  preventSelection?: boolean;
  /** Consume only the matching pointer's synthetic click, never keyboard/other click. */
  suppressClick?: boolean;
  onStart?: (event: PointerEvent) => void;
  onMove?: (event: PointerEvent) => void;
  /** Called exactly once; callers commit only when reason is up and started is true. */
  onFinish: (result: PointerGestureResult) => void;
}

export interface PointerGestureSession { cancel(): void; }

type SelectionLock = { count: number; previous: string };
const selectionLocks = new WeakMap<Document, SelectionLock>();
/** One outstanding click guard per drag origin. No global 350ms click blackout. */
const clickGuards = new WeakMap<HTMLElement, () => void>();

function lockSelection(doc: Document): () => void {
  const previous = selectionLocks.get(doc);
  if (previous) previous.count++;
  else if (doc.body) {
    selectionLocks.set(doc, { count: 1, previous: doc.body.style.userSelect });
    doc.body.style.userSelect = 'none';
  }
  return () => {
    const lock = selectionLocks.get(doc);
    if (!lock || --lock.count > 0) return;
    if (doc.body) doc.body.style.userSelect = lock.previous;
    selectionLocks.delete(doc);
  };
}

/** Only a matching pointer-click on the gesture origin in the pointerup task is blocked. */
function blockGeneratedClick(doc: Document, origin: HTMLElement, pointerId: number): void {
  clickGuards.get(origin)?.();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    doc.removeEventListener('click', captureClick, { capture: true });
    if (timer !== undefined) clearTimeout(timer);
    if (clickGuards.get(origin) === clear) clickGuards.delete(origin);
  };
  const captureClick = (event: MouseEvent) => {
    if (event.detail === 0) return; // Keyboard activation is not a pointer click.
    const id = (event as MouseEvent & { pointerId?: number }).pointerId;
    if (typeof id === 'number' && id !== pointerId) return;
    const target = event.target;
    if (!target || !('nodeType' in target) || !origin.contains(target as Node)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clear();
  };
  clickGuards.set(origin, clear);
  doc.addEventListener('click', captureClick, { capture: true });
  // Native click follows pointerup in the same user-interaction task. Other clicks stay usable.
  timer = setTimeout(clear, 0);
}

/** For Escape/blur/lost capture, wait for *that pointer's* up before guarding its click. */
function suppressCancelledPointerClick(doc: Document, origin: HTMLElement, pointerId: number): void {
  clickGuards.get(origin)?.();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    doc.removeEventListener('pointerup', up, { capture: true });
    doc.removeEventListener('pointercancel', cancel, { capture: true });
    doc.removeEventListener('pointerdown', nextDown, { capture: true });
    if (timer !== undefined) clearTimeout(timer);
    if (clickGuards.get(origin) === clear) clickGuards.delete(origin);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clear();
    blockGeneratedClick(doc, origin, pointerId);
  };
  const cancel = (event: PointerEvent) => { if (event.pointerId === pointerId) clear(); };
  const nextDown = () => clear(); // A separate gesture supersedes an abandoned one.
  clickGuards.set(origin, clear);
  doc.addEventListener('pointerup', up, { capture: true });
  doc.addEventListener('pointercancel', cancel, { capture: true });
  doc.addEventListener('pointerdown', nextDown, { capture: true });
  // No suppression occurs until a matching up. Bound the abandoned listener lifetime.
  timer = setTimeout(clear, 1000);
}

/** Capture is deliberately deferred until activation, preserving nested native clicks/focus. */
export function beginPointerGesture(start: PointerGestureStart, options: PointerGestureOptions): PointerGestureSession | null {
  if (start.button !== 0 || start.isPrimary === false) return null;
  const origin = start.currentTarget;
  const doc = origin.ownerDocument;
  const view = doc.defaultView;
  const pointerId = start.pointerId;
  const threshold = Math.max(0, Number.isFinite(options.threshold) ? options.threshold! : 0);
  clickGuards.get(origin)?.();
  let x = start.clientX;
  let y = start.clientY;
  let active = false;
  let captured = false;
  let ended = false;
  let releaseSelection: (() => void) | undefined;

  const move = (event: PointerEvent) => {
    if (ended || event.pointerId !== pointerId) return;
    x = event.clientX;
    y = event.clientY;
    if (!active && Math.hypot(x - start.clientX, y - start.clientY) > threshold) {
      active = true;
      if (options.preventSelection && doc.body) releaseSelection = lockSelection(doc);
      try {
        origin.setPointerCapture(pointerId);
        captured = true;
      } catch { /* Document capture listeners still see move/up without capture. */ }
      options.onStart?.(event);
    }
    if (active && !ended) options.onMove?.(event);
  };

  const finish = (reason: PointerGestureEndReason) => {
    if (ended) return;
    ended = true;
    doc.removeEventListener('pointermove', move, { capture: true });
    doc.removeEventListener('pointerup', up, { capture: true });
    doc.removeEventListener('pointercancel', cancel, { capture: true });
    doc.removeEventListener('keydown', escape, { capture: true });
    doc.removeEventListener('visibilitychange', hidden);
    origin.removeEventListener('lostpointercapture', lost);
    view?.removeEventListener('blur', blur);
    releaseSelection?.();
    if (captured) {
      try { if (origin.hasPointerCapture(pointerId)) origin.releasePointerCapture(pointerId); }
      catch { /* Detached nodes may already have lost capture. */ }
    }
    if (active && options.suppressClick) {
      if (reason === 'up') blockGeneratedClick(doc, origin, pointerId);
      else if (reason === 'escape' || reason === 'blur' || reason === 'lostcapture') {
        suppressCancelledPointerClick(doc, origin, pointerId);
      }
      // Native pointercancel cannot synthesize a click. Dispose never arms suppression.
    }
    options.onFinish({ reason, started: active, clientX: x, clientY: y });
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    move(event);
    finish('up');
  };
  const cancel = (event: PointerEvent) => { if (event.pointerId === pointerId) finish('pointercancel'); };
  const lost = (event: PointerEvent) => {
    if (event.target === origin && event.pointerId === pointerId) finish('lostcapture');
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.isComposing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish('escape');
  };
  const blur = () => finish('blur');
  const hidden = () => { if (doc.visibilityState === 'hidden') finish('hidden'); };

  doc.addEventListener('pointermove', move, { capture: true });
  doc.addEventListener('pointerup', up, { capture: true });
  doc.addEventListener('pointercancel', cancel, { capture: true });
  doc.addEventListener('keydown', escape, { capture: true });
  doc.addEventListener('visibilitychange', hidden);
  origin.addEventListener('lostpointercapture', lost);
  view?.addEventListener('blur', blur);
  return { cancel: () => {
    if (ended) return;
    clickGuards.get(origin)?.();
    finish('dispose');
  } };
}
