export type Selection<T> = {
  ids: readonly string[];
  /** Only for explicitly selected, currently unloaded records. Never authoritative data. */
  retained: ReadonlyMap<string, T>;
  anchor: string | null;
};

export function emptySelection<T>(): Selection<T> {
  return { ids: [], retained: new Map(), anchor: null };
}

export function rangeKeys(keys: readonly string[], anchor: string | null, target: string): string[] {
  const start = anchor === null ? -1 : keys.indexOf(anchor);
  const end = keys.indexOf(target);
  if (end < 0) return [];
  return start < 0 ? [target] : keys.slice(Math.min(start, end), Math.max(start, end) + 1);
}

export function selectedItems<T>(selection: Selection<T>, visible: ReadonlyMap<string, T>, retainMissing: boolean): T[] {
  return selection.ids.flatMap(id => {
    const item = visible.get(id) ?? (retainMissing ? selection.retained.get(id) : undefined);
    return item === undefined ? [] : [item];
  });
}

export function changeSelection<T>(
  selection: Selection<T>, visible: ReadonlyMap<string, T>, keys: readonly string[],
  operation: 'select' | 'unselect' | 'toggle' | 'range', retainMissing: boolean,
): Selection<T> {
  const ids = new Set(selection.ids.filter(id => retainMissing || visible.has(id)));
  const retained = new Map(selection.retained);
  for (const key of keys) {
    if (operation === 'unselect' || operation === 'toggle' && ids.has(key)) {
      ids.delete(key);
      retained.delete(key);
      continue;
    }
    const item = visible.get(key);
    if (item === undefined) continue;
    ids.add(key);
    if (retainMissing) retained.set(key, item);
  }
  for (const id of retained.keys()) {
    if (!ids.has(id)) retained.delete(id);
    else if (visible.has(id)) retained.set(id, visible.get(id)!);
  }
  return {
    ids: [...ids], retained,
    anchor: operation === 'range' ? selection.anchor ?? keys[0] ?? null : keys.at(-1) ?? selection.anchor,
  };
}
