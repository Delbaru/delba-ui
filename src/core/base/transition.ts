import { clamp01 } from '../utils';
import { prefersReducedMotion } from './motion';

/** Чем кончилось движение: доехало само или его прервали (новым движением, `cancel`, уходом узла). */
export type TransitionStatus = 'finished' | 'interrupted';

export interface TransitionResult {
  status: TransitionStatus;
}

/** Отметка внутри хода: миллисекунды от старта, доля хода, его начало или конец. */
export type TransitionTime = number | `${number}%` | 'start' | 'end';

/**
 * Один объект на одно движение: его ждут `await`-ом, вешают на него отметки времени, прерывают.
 * `await t` — то же, что `await t.finished`.
 */
export interface Transition extends PromiseLike<TransitionResult> {
  /** Движение реально пошло: задержка кончилась, первый кадр отрисован. */
  readonly started: Promise<void>;
  /** Итог. НЕ отклоняется: прерванное движение даёт `{ status: 'interrupted' }`. */
  readonly finished: Promise<TransitionResult>;
  /** Выполнить на отметке хода. `'end'` не срабатывает у прерванного движения. */
  at(time: TransitionTime, run: () => void): Transition;
  /** Доля хода 0…1 каждый кадр. Кадровый цикл крутится, только пока есть подписчик. */
  on(event: 'progress', run: (progress: number) => void): Transition;
  cancel(): void;
  reverse(): void;
}

/** Шаг последовательности: готовый переход или отложенный — его создадут, когда дойдёт очередь. */
export type TransitionStep = Transition | (() => Transition);

const FINISHED: TransitionResult = { status: 'finished' };

/** Длительность из CSS-значения токена (`0.3s`, `300ms`, пусто) в миллисекундах. */
export function parseDurationMs(value: string): number {
  const token = value.trim();

  if (!token) return 0;

  const ms = token.endsWith('ms') ? parseFloat(token) : parseFloat(token) * 1000;

  return Number.isFinite(ms) ? ms : 0;
}

/** Доля хода, на которой стоит отметка: `'start'` → 0, `'end'` → 1, проценты и мс — от длительности. */
export function resolveAtProgress(time: TransitionTime, durationMs: number): number {
  if (time === 'start') return 0;
  if (time === 'end') return 1;
  if (typeof time === 'string') return clamp01(parseFloat(time) / 100);
  if (durationMs <= 0) return 1;

  return clamp01(time / durationMs);
}

/** Итог группы: прервали хоть одного участника — прервана вся группа. */
export function combineStatus(statuses: readonly TransitionStatus[]): TransitionStatus {
  return statuses.some((status) => status === 'interrupted') ? 'interrupted' : 'finished';
}

export interface MotionPart {
  progress: number;
  durationMs: number;
}

export interface GroupTiming {
  elapsedMs: number;
  durationMs: number;
}

/** Общий ход параллельной группы: длится самое долгое движение, прошло — у самого дальнего. */
export function parallelTiming(parts: readonly MotionPart[]): GroupTiming {
  let elapsedMs = 0;
  let durationMs = 0;

  for (const part of parts) {
    elapsedMs = Math.max(elapsedMs, part.progress * part.durationMs);
    durationMs = Math.max(durationMs, part.durationMs);
  }

  return { elapsedMs, durationMs };
}

/**
 * Общий ход очереди: длительности складываются, пройденное — целиком прошлые шаги плюс кусок
 * текущего. Отложенные шаги своей длины ещё не знают и считаются нулевыми, пока их не создадут.
 */
export function serialTiming(parts: readonly MotionPart[], index: number): GroupTiming {
  let elapsedMs = 0;
  let durationMs = 0;

  parts.forEach((part, at) => {
    durationMs += part.durationMs;

    if (at < index) elapsedMs += part.durationMs;
    else if (at === index) elapsedMs += part.progress * part.durationMs;
  });

  return { elapsedMs, durationMs };
}

/** Доля хода из пройденного и полного времени. Нулевая длительность — ход уже весь позади. */
export function toProgress({ elapsedMs, durationMs }: GroupTiming): number {
  return durationMs > 0 ? clamp01(elapsedMs / durationMs) : 1;
}

// Движок перехода: всё, что знает о времени. Публичный объект поверх него одинаков для WAAPI,
// групп и пустого хода, поэтому группы вкладываются друг в друга без оговорок.
interface TransitionCore {
  durationMs(): number;
  progress(): number;
  /** Задержка до «реально пошло», мс. */
  delayMs(): number;
  /** Движок принял движение (у WAAPI — `animation.ready`). */
  ready: Promise<void>;
  finished: Promise<TransitionResult>;
  cancel(): void;
  reverse(): void;
}

const CORES = new WeakMap<Transition, TransitionCore>();

// Часть группы: у чужого объекта (не нашей сборки) времени не спросить — считаем его мгновенным.
function partOf(transition: Transition): MotionPart {
  const core = CORES.get(transition);

  return core ? { progress: core.progress(), durationMs: core.durationMs() } : { progress: 1, durationMs: 0 };
}

const nextFrame = (run: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else queueMicrotask(run);
};

function buildTransition(core: TransitionCore): Transition {
  const marks = new Set<{ threshold: number; run: () => void }>();
  const progressListeners = new Set<(progress: number) => void>();
  let running = false;
  let settled: TransitionStatus | null = null;

  const tick = (): void => {
    running = false;

    // Прерванный ход дальше не идёт: отметки, до которых он не дошёл, не срабатывают.
    if (settled === 'interrupted') {
      marks.clear();
      progressListeners.clear();

      return;
    }

    const progress = settled ? 1 : core.progress();

    for (const listener of progressListeners) listener(progress);

    for (const mark of [...marks]) {
      if (progress < mark.threshold) continue;
      marks.delete(mark);
      mark.run();
    }

    if (settled) {
      progressListeners.clear();

      return;
    }

    if (marks.size > 0 || progressListeners.size > 0) watch();
  };

  // Кадровый цикл крутится, только пока есть кому слушать, — иначе каждый ход держал бы rAF.
  const watch = (): void => {
    if (running) return;

    running = true;
    nextFrame(tick);
  };

  core.finished.then((result) => {
    settled = result.status;
    watch();
  });

  // «Пошло» — это конец задержки, а не постановка в очередь: до неё узел ещё стоит на месте.
  const started = core.ready.then(() => {
    const delayMs = core.delayMs();

    if (delayMs <= 0) return undefined;

    return new Promise<void>((resolve) => {
      marks.add({ threshold: clamp01(delayMs / Math.max(core.durationMs(), 1)), run: resolve });
      core.finished.then(() => resolve());
      watch();
    });
  });

  const transition: Transition = {
    started,
    finished: core.finished,
    at(time, run) {
      if (time === 'start') {
        started.then(run);

        return transition;
      }

      if (time === 'end') {
        core.finished.then((result) => {
          if (result.status === 'finished') run();
        });

        return transition;
      }

      marks.add({ threshold: resolveAtProgress(time, core.durationMs()), run });
      watch();

      return transition;
    },
    on(_event, run) {
      progressListeners.add(run);
      watch();

      return transition;
    },
    cancel: () => core.cancel(),
    reverse: () => core.reverse(),
    then: (onFinished, onRejected) => core.finished.then(onFinished, onRejected),
  };

  CORES.set(transition, core);

  return transition;
}

function doneTransition(): Transition {
  return buildTransition({
    durationMs: () => 0,
    progress: () => 1,
    delayMs: () => 0,
    ready: Promise.resolve(),
    finished: Promise.resolve(FINISHED),
    cancel: () => undefined,
    reverse: () => undefined,
  });
}

function toMs(value: CSSNumberish | null | undefined): number {
  if (value === null || value === undefined) return 0;

  return typeof value === 'number' ? value : value.to('ms').value;
}

/**
 * Переход поверх уже запущенных анимаций Web Animations API — дверь, через которую любой глагол
 * кита отдаёт своё движение наружу. Пустой список — ничего не поехало, то есть `Transition.done()`.
 *
 * Почему WAAPI, а не CSS-переход: у него есть точное время (`currentTime`), прогресс, `reverse`,
 * `cancel` и синхронный старт нескольких узлов в одном кадре — на `transitionend` этого нет.
 */
export function createTransition(animations: readonly Animation[]): Transition {
  if (animations.length === 0) return doneTransition();

  const timings = animations.map((animation) => {
    const timing = animation.effect?.getComputedTiming();

    return { delayMs: timing?.delay ?? 0, endMs: toMs(timing?.endTime) };
  });

  const durationMs = timings.reduce((max, timing) => Math.max(max, timing.endMs), 0);
  const delayMs = timings.reduce((min, timing) => Math.min(min, timing.delayMs), Infinity);
  const leadAt = timings.reduce((lead, timing, at) => (timing.endMs > (timings[lead]?.endMs ?? 0) ? at : lead), 0);
  const lead = animations[leadAt];

  const statuses = animations.map((animation) =>
    animation.finished.then<TransitionStatus, TransitionStatus>(() => 'finished', () => 'interrupted')
  );

  return buildTransition({
    durationMs: () => durationMs,
    progress: () => (durationMs > 0 && lead ? clamp01(toMs(lead.currentTime) / durationMs) : 1),
    delayMs: () => (Number.isFinite(delayMs) ? delayMs : 0),
    ready: Promise.all(animations.map((animation) => animation.ready)).then(() => undefined, () => undefined),
    finished: Promise.all(statuses).then((list) => ({ status: combineStatus(list) })),
    cancel: () => animations.forEach((animation) => animation.cancel()),
    reverse: () => animations.forEach((animation) => animation.reverse()),
  });
}

/**
 * Длительность и плавность движения из токенов проекта у конкретного узла: `--t-d-*` / `--t-t-f-*`
 * наследуются, поэтому call-site переопределяет их переменной, не трогая кит. При «меньше движения»
 * длительность нулевая — события и `finished` всё равно срабатывают, логика сценария не рвётся.
 */
export function readMotionTiming(
  node: Element,
  tokens: { duration: readonly string[]; easing: readonly string[]; delay?: readonly string[] }
): { duration: number; easing: string; delay: number } {
  const style = getComputedStyle(node);
  const reduced = prefersReducedMotion();
  const first = (names: readonly string[] | undefined): string => {
    for (const name of names ?? []) {
      const value = style.getPropertyValue(name).trim();

      if (value) return value;
    }

    return '';
  };

  return {
    duration: reduced ? 0 : parseDurationMs(first(tokens.duration)),
    delay: reduced ? 0 : parseDurationMs(first(tokens.delay)),
    easing: first(tokens.easing) || 'ease',
  };
}

/** Общий старт, общий финиш: группа кончилась, когда доехал последний. */
function together(...children: readonly Transition[]): Transition {
  if (children.length === 0) return doneTransition();

  const timing = (): GroupTiming => parallelTiming(children.map(partOf));

  return buildTransition({
    durationMs: () => timing().durationMs,
    progress: () => toProgress(timing()),
    delayMs: () => 0,
    ready: Promise.race(children.map((child) => child.started)),
    finished: Promise.all(children.map((child) => child.finished)).then((results) => ({
      status: combineStatus(results.map((result) => result.status)),
    })),
    cancel: () => children.forEach((child) => child.cancel()),
    reverse: () => children.forEach((child) => child.reverse()),
  });
}

/**
 * По очереди: следующий шаг начинается, когда доехал предыдущий. Прерванный шаг обрывает очередь —
 * остальные не начинаются, иначе прерывание догоняло бы пользователя хвостом чужого движения.
 */
function sequence(...steps: readonly TransitionStep[]): Transition {
  if (steps.length === 0) return doneTransition();

  const played: MotionPart[] = [];
  const children: Transition[] = [];
  let index = 0;
  let cancelled = false;
  let reversed = false;

  let markStarted = (): void => undefined;
  const ready = new Promise<void>((resolve) => {
    markStarted = resolve;
  });

  const finished = (async (): Promise<TransitionResult> => {
    const statuses: TransitionStatus[] = [];

    for (const step of steps) {
      if (cancelled) {
        statuses.push('interrupted');
        break;
      }

      const child = typeof step === 'function' ? step() : step;

      children[index] = child;
      child.started.then(markStarted);
      if (reversed) child.reverse();

      const result = await child.finished;

      played[index] = partOf(child);
      statuses.push(result.status);
      index += 1;

      if (result.status === 'interrupted') break;
    }

    markStarted();

    return { status: combineStatus(statuses) };
  })();

  const timing = (): GroupTiming => {
    const current = children[index];
    const parts = [...played];

    if (current) parts[index] = partOf(current);

    return serialTiming(parts, index);
  };

  return buildTransition({
    durationMs: () => timing().durationMs,
    progress: () => toProgress(timing()),
    delayMs: () => 0,
    ready,
    finished,
    cancel: () => {
      cancelled = true;
      children[index]?.cancel();
    },
    reverse: () => {
      reversed = !reversed;
      children[index]?.reverse();
    },
  });
}

/** Сборка переходов: `motion.together(a, b)` и `motion.sequence(a, () => b)`. */
export const motion = { together, sequence };

/**
 * `Transition.done()` — ход, которого не было: уже открыто, «меньше движения», нечего двигать.
 * Отметки и `finished` срабатывают, поэтому сценарий пишется одинаково и без проверок «а поехало ли».
 */
export const Transition = { done: doneTransition };
