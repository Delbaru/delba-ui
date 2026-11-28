import { rangeKeys } from './Selection';

/** Apply the requested state to the visible range, skipping unchanged and disabled items. */
export function checkRangeItems<T extends { id: string }>(
  items: readonly T[],
  anchor: string | null,
  target: string,
  checked: boolean,
  canChange: (item: T) => boolean,
  isChecked: (item: T) => boolean,
): T[] {
  const visible = new Map(items.map(item => [item.id, item]));
  const clicked = visible.get(target);
  if (!clicked || !canChange(clicked)) return [];

  return rangeKeys([...visible.keys()], anchor, target)
    .map(id => visible.get(id)!)
    .filter(item => canChange(item) && isChecked(item) !== checked);
}

/** Await each write in order. A rejection leaves confirmed writes in place and stops the range. */
export async function applyCheckRange<T>(
  items: readonly T[],
  write: (item: T) => Promise<unknown>,
): Promise<void> {
  for (const item of items) {
    await write(item);
  }
}
