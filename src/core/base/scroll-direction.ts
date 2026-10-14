export interface ScrollSnapshot {
  y: number;
  travel: number;
  direction: 'up' | 'down' | null;
  pastThreshold: boolean;
}

export interface ScrollWatchOptions {
  /** Накопленное расстояние до подтверждения смены направления, в CSS px. */
  direction?: { down: number; up: number };
  /** Порог с гистерезисом: enter включает состояние, exit выключает. */
  threshold?: { enter: number; exit: number };
}

export const initialScroll: ScrollSnapshot = { y: 0, travel: 0, direction: null, pastThreshold: false };

export interface ScrollState extends ScrollSnapshot {
  /** Пройдено не меньше distance CSS px вниз с последнего разворота. */
  down(distance?: number): boolean;
  /** Пройдено не меньше distance CSS px вверх с последнего разворота. */
  up(distance?: number): boolean;
}

/** Проверки используют накопленный путь, а не один последний scroll event. */
export function createScrollState(snapshot: ScrollSnapshot): ScrollState {
  return {
    ...snapshot,
    down: (distance = 1) => snapshot.travel > 0 && snapshot.travel >= Math.max(0, distance),
    up: (distance = 1) => snapshot.travel < 0 && -snapshot.travel >= Math.max(0, distance),
  };
}

export function advanceScroll(previous: ScrollSnapshot, y: number, options: ScrollWatchOptions): ScrollSnapshot {
  const delta = y - previous.y;
  const travel = delta === 0 ? previous.travel : Math.sign(delta) === Math.sign(previous.travel) ? previous.travel + delta : delta;
  const down = options.direction?.down ?? 1;
  const up = options.direction?.up ?? 1;
  const direction = y <= 0 ? null : travel >= down ? 'down' : travel <= -up ? 'up' : previous.direction;
  const threshold = options.threshold;
  const pastThreshold = threshold ? y >= threshold.enter || (previous.pastThreshold && y > threshold.exit) : false;
  return { y, travel: y <= 0 ? 0 : travel, direction, pastThreshold };
}
