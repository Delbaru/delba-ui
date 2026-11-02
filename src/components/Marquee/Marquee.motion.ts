import type { RefObject } from 'react';
import { observeAnimationVisibility } from '../../core/base/animation-visibility';
import { readMotionDefaultMs } from '../../core/base/motion-config';
import { timeResponse } from '../../core/base/damping';

// Длинный кадр (вкладка в фоне, затык главного потока) не должен отбрасывать ленту скачком.
const MAX_DT_S = 0.1;
// Пока палец сдвинулся меньше — это клик по ссылке внутри, а не перетаскивание.
const DRAG_START_PX = 6;
// Скорость броска берётся по последним движениям, а не по всему жесту: остановился и отпустил — не бросил.
const FLING_WINDOW_MS = 100;
const MAX_FLING = 4000;
const IDLE_SPEED = 0.5;
const DRAGGING_STATE = 'dragging';

function addStateToken(node: HTMLElement, token: string) {
  const states = new Set((node.getAttribute('state') ?? '').split(/\s+/).filter(Boolean));
  states.add(token);
  node.setAttribute('state', [...states].join(' '));
}

function removeStateToken(node: HTMLElement, token: string) {
  const states = (node.getAttribute('state') ?? '').split(/\s+/).filter((state) => state !== token);
  if (states.length) node.setAttribute('state', states.join(' '));
  else node.removeAttribute('state');
}
// Страховка от петли «копий больше — окно шире»: окну ширину даёт раскладка (`contain` в модуле),
// но если потребитель её перебьёт, лента остановится на потолке, а не съест кадр.
const MAX_COPIES = 12;

interface MarqueeSession {
  root: HTMLElement;
  track: HTMLElement;
  live: RefObject<{ speed: number; reverse: boolean; paused: boolean; wake: () => void }>;
  draggable: boolean;
  setCopies: (copies: number) => void;
}

/** A single session owns motion, drag, listeners and their cleanup. */
export function attachMarquee({ root, track, live, draggable, setCopies }: MarqueeSession) {
  const view = root.ownerDocument.defaultView;
  if (!view) return () => {};
  let visible = false;

  // Бросок, пауза и разгон следуют одной настроенной постоянной времени.
  const easeSeconds = readMotionDefaultMs('marquee', 'easeDuration', root) / 1000;

  let offset = 0;
  let velocity = 0;
  let period = 0;
  let raf = 0;
  let last = 0;
  let hover = false;
  let focus = false;
  const drag = {
    id: -1,
    pending: false,
    active: false,
    x: 0,
    from: 0,
    moved: false,
    samples: [] as { t: number; x: number }[],
  };

  const measure = () => {
    const [first, second] = Array.from(track.children) as HTMLElement[];
    if (!first || !second) return;
    period = second.offsetLeft - first.offsetLeft;
    if (period > 0)
      setCopies(Math.min(MAX_COPIES, Math.max(2, Math.ceil(root.clientWidth / period) + 1)));
  };

  const place = () => {
    if (period > 0) offset = marqueeMotion.wrap(offset, period);
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  };

  const target = () => {
    const { speed, reverse, paused } = live.current;
    if (paused || hover || focus) return 0;
    return reverse ? -speed : speed;
  };

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT_S);
    last = now;
    const goal = target();

    if (!drag.active) {
      velocity += (goal - velocity) * timeResponse(easeSeconds, dt * 1000);
      offset += velocity * dt;
    }

    place();

    const idle = !drag.active && goal === 0 && Math.abs(velocity) < IDLE_SPEED;
    if (idle) velocity = 0;
    raf = idle || !visible ? 0 : view.requestAnimationFrame(frame);
  };

  const wake = () => {
    if (raf || !visible) return;
    last = view.performance.now();
    raf = view.requestAnimationFrame(frame);
  };
  live.current.wake = wake;

  const onPointerDown = (e: PointerEvent) => {
    if (!draggable || e.button !== 0) return;
    Object.assign(drag, {
      id: e.pointerId,
      pending: true,
      active: false,
      x: e.clientX,
      from: offset,
      moved: false,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    });
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
      addStateToken(root, DRAGGING_STATE);
      wake();
    }

    offset = drag.from - dx;
    drag.samples.push({ t: e.timeStamp, x: e.clientX });
    while (drag.samples.length > 2 && e.timeStamp - (drag.samples[0]?.t ?? 0) > FLING_WINDOW_MS)
      drag.samples.shift();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.type === 'lostpointercapture' && e.target !== root) return;
    if (e.pointerId !== drag.id) return;
    const [first] = drag.samples;
    const lastSample = drag.samples[drag.samples.length - 1];

    if (
      e.type === 'pointerup' &&
      drag.active &&
      first &&
      lastSample &&
      lastSample.t > first.t &&
      e.timeStamp - lastSample.t < FLING_WINDOW_MS
    ) {
      velocity = marqueeMotion.fling(first, lastSample);
    }

    if (drag.active) removeStateToken(root, DRAGGING_STATE);
    Object.assign(drag, { id: -1, pending: false, active: false });
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
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
    const next = e.relatedTarget;
    if (next instanceof view.Node && root.contains(next)) return;
    focus = false;
    wake();
  };
  const onDragStart = (e: DragEvent) => e.preventDefault();

  const listeners = [
    ['pointerdown', onPointerDown],
    ['pointermove', onPointerMove],
    ['pointerup', onPointerUp],
    ['pointercancel', onPointerUp],
    ['lostpointercapture', onPointerUp],
    ['pointerenter', onEnter],
    ['pointerleave', onLeave],
    ['focusin', onFocusIn],
    ['focusout', onFocusOut],
    ['dragstart', onDragStart],
  ] as const;
  for (const [type, fn] of listeners) root.addEventListener(type, fn as EventListener);
  root.addEventListener('click', onClick, true);

  const observer = new view.ResizeObserver(() => {
    measure();
    place();
  });
  observer.observe(root);
  observer.observe(track);
  measure();
  const stopVisibility = observeAnimationVisibility(root, (next) => {
    visible = next;
    if (visible) wake();
    else {
      view.cancelAnimationFrame(raf);
      raf = 0;
    }
  });

  return () => {
    view.cancelAnimationFrame(raf);
    observer.disconnect();
    stopVisibility();
    for (const [type, fn] of listeners) root.removeEventListener(type, fn as EventListener);
    if (drag.id >= 0 && root.hasPointerCapture(drag.id)) root.releasePointerCapture(drag.id);
    root.removeEventListener('click', onClick, true);
    removeStateToken(root, DRAGGING_STATE);
    track.style.transform = '';
    live.current.wake = () => {};
  };
}

/** Cyclic coordinates and recent-sample inertia, independent of the DOM clock. */
export const marqueeMotion = {
  wrap(offset: number, period: number) {
    return ((offset % period) + period) % period;
  },
  fling(first: { t: number; x: number }, last: { t: number; x: number }) {
    const elapsed = last.t - first.t;
    if (elapsed <= 0) return 0;
    const velocity = -((last.x - first.x) / elapsed) * 1000;
    return Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity));
  },
};
