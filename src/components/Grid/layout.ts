import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { MotionTime } from '../../core/base/timing';
import type { MotionDistance } from '../../core/base/distance';
import type { GridItemProps } from './Grid';

export interface GridLayoutAnimate {
  /** Перестроение по ключам прямых GridItem при изменении состава, порядка или колонок. */
  when: 'change';
  /** Сохраняет DOM оставшихся элементов; вход и выход относятся только к изменившимся. */
  effect: 'layout';
  /** Длительность входа, выхода и перемещения: секунды либо имя шкалы темы. */
  duration?: MotionTime;
  /** Сдвиг при входе и выходе; по умолчанию 12 rpx. Перемещение вычисляется из геометрии. */
  distance?: MotionDistance;
  /** Интервал появления новых элементов. Существующие элементы не получают задержку. */
  stagger?: MotionTime;
}

export type LayoutEntry = { key: string; element: ReactElement<GridItemProps>; exiting: boolean };

export function layoutEntries(children: ReactNode): LayoutEntry[] {
  const result: LayoutEntry[] = [];
  const keys = new Set<string>();
  Children.forEach(children, (child) => {
    if (child == null || typeof child === 'boolean') return;
    if (!isValidElement<GridItemProps>(child) || child.key == null) {
      throw new Error('Grid layout animation requires direct GridItem children with stable keys.');
    }
    const key = String(child.key);
    if (keys.has(key)) throw new Error(`Grid layout animation: duplicate key "${key}".`);
    keys.add(key);
    result.push({ key, element: child, exiting: false });
  });
  return result;
}

export function retainLayoutExits(current: LayoutEntry[], next: LayoutEntry[]): LayoutEntry[] {
  const keys = new Set(next.map((entry) => entry.key));
  return next.concat(current.filter((entry) => !keys.has(entry.key)).map((entry) => ({ ...entry, exiting: true })));
}

export function isGridLayoutAnimate(value: unknown): value is GridLayoutAnimate {
  return Boolean(value && typeof value === 'object' && 'when' in value && value.when === 'change'
    && 'effect' in value && value.effect === 'layout');
}
