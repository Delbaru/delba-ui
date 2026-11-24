export type Selection<T> = {
  ids: readonly string[];
  /** Only for explicitly selected, currently unloaded records. Never authoritative data. */
  retained: ReadonlyMap<string, T>;
  anchor: string | null;
};

export function emptySelection<T>(): Selection<T> {
  return { ids: [], retained: new Map(), anchor: null };
}

/** Keyboard extension starts at the focused item if there is no loaded anchor. */
export function rangeKeys(keys: readonly string[], anchor: string | null, target: string, origin?: string): string[] {
  const anchored = anchor === null ? -1 : keys.indexOf(anchor);
  const start = anchored < 0 && origin !== undefined ? keys.indexOf(origin) : anchored;
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

/** Forget unloaded records when retention is not explicitly enabled. */
export function pruneSelection<T>(selection: Selection<T>, visible: ReadonlyMap<string, T>, retainMissing: boolean): Selection<T> {
  if (retainMissing) {
    let retained: Map<string, T> | undefined;
    for (const id of selection.ids) {
      if (!visible.has(id)) continue;
      const item = visible.get(id)!;
      if (Object.is(selection.retained.get(id), item)) continue;
      retained ??= new Map(selection.retained);
      retained.set(id, item);
    }
    return retained ? { ...selection, retained } : selection;
  }
  const ids = selection.ids.filter(id => visible.has(id));
  const anchor = selection.anchor !== null && visible.has(selection.anchor) ? selection.anchor : null;
  if (ids.length === selection.ids.length && anchor === selection.anchor && !selection.retained.size) return selection;
  return { ids, anchor, retained: new Map() };
}

export function changeSelection<T>(
  selection: Selection<T>, visible: ReadonlyMap<string, T>, keys: readonly string[],
  operation: 'select' | 'unselect' | 'toggle' | 'range', retainMissing: boolean,
  mode: 'single' | 'multiple' = 'multiple',
  rangeOrigin?: string,
): Selection<T> {
  selection = pruneSelection(selection, visible, retainMissing);
  const ids = new Set(selection.ids);
  const retained = new Map(selection.retained);
  for (const key of keys) {
    if (operation === 'unselect' || operation === 'toggle' && ids.has(key)) {
      ids.delete(key);
      retained.delete(key);
      continue;
    }
    const item = visible.get(key);
    if (item === undefined) continue;
    if (mode === 'single') {
      ids.clear();
      retained.clear();
    }
    ids.add(key);
    if (retainMissing) retained.set(key, item);
  }
  for (const id of retained.keys()) {
    if (!ids.has(id)) retained.delete(id);
    else if (visible.has(id)) retained.set(id, visible.get(id)!);
  }
  return {
    ids: [...ids], retained,
    anchor: operation === 'range'
      ? (selection.anchor !== null && visible.has(selection.anchor) ? selection.anchor : rangeOrigin ?? keys[0] ?? null)
      : keys.at(-1) ?? selection.anchor,
  };
}
