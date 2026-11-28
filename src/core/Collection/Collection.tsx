'use client';

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type MouseEvent, type KeyboardEvent, type ReactNode } from 'react';
import { changeSelection, emptySelection, pruneSelection, rangeKeys, selectedItems, type Selection } from './Selection';

export type CollectionDefinition<T> = {
  readonly token: symbol;
  readonly key: (item: T) => string;
};

export interface CollectionItem {
  checked: boolean;
  collectionId?: string;
  key?: string;
  toggle(): void;
  selectRange(): void;
  onMouseDown(event: MouseEvent<HTMLElement>): void;
  onClick(event: MouseEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

export interface CollectionScope {
  token: symbol;
  domId?: string;
  item(id: string): CollectionItem;
}

export interface CollectionOptions {
  /** A new owner/query key resets local selection and the range anchor. */
  scope?: string;
  retainMissing?: boolean;
  mode?: 'single' | 'multiple';
  /** The owner's selection when present. */
  value?: readonly string[];
  /** Initial local selection for each owner. */
  defaultValue?: readonly string[];
  /** Reports changed IDs requested by a collection action. */
  onValueChange?: (ids: readonly string[]) => void;
}

export interface CollectionController<T> extends CollectionScope {
  items: readonly T[];
  selected: readonly T[];
  ids: readonly string[];
  count: number;
  select(id: string): void;
  unselect(id: string): void;
  toggle(id: string): void;
  selectAll(): void;
  clear(): void;
}

export function defineCollection<T extends { id: string }>(name: string): CollectionDefinition<T>;
export function defineCollection<T>(name: string, key: (item: T) => string): CollectionDefinition<T>;
export function defineCollection<T>(name: string, key?: (item: T) => string): CollectionDefinition<T> {
  return { token: Symbol(name), key: key ?? (item => (item as { id: string }).id) };
}

function interactive(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
  const target = event.target as Element | null;
  if (!target?.closest) return false;
  if (!event.currentTarget.contains(target)) return true;
  const nested = target.closest('[data-ui-selectable]');
  if (nested && nested !== event.currentTarget && event.currentTarget.contains(nested)) return true;
  const control = target.closest('a,button,input,textarea,select,label,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="radio"],[role="combobox"],[role="menuitem"],[contenteditable]:not([contenteditable="false"])');
  return !!control && control !== event.currentTarget;
}

function hasTextSelection(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  return !!event.currentTarget.ownerDocument.defaultView?.getSelection()?.toString();
}

function normalizeIds(ids: readonly string[], mode: 'single' | 'multiple'): readonly string[] {
  return mode === 'single' ? ids.slice(0, 1) : [...new Set(ids)];
}

/** Selection is owned by the local instance; the definition never holds user data. */
export function useCollection<T>(
  definition: CollectionDefinition<T>, items: readonly T[],
  options: CollectionOptions = {},
): CollectionController<T> {
  const { scope = '', retainMissing = false, mode = 'multiple', value, defaultValue, onValueChange } = options;
  const controlled = value !== undefined;
  const domId = useId();
  type State = {
    scope: string;
    token: symbol;
    mode: typeof mode;
    controlled: boolean;
    owner: symbol;
    selection: Selection<T>;
  };
  const createState = (): State => ({
    scope,
    token: definition.token,
    mode,
    controlled,
    owner: Symbol(),
    selection: {
      ...emptySelection<T>(),
      ids: !controlled && defaultValue ? normalizeIds(defaultValue, mode) : [],
    },
  });
  const [stored, setState] = useState<State>(createState);
  const sameOwner = stored.scope === scope && stored.token === definition.token &&
    stored.mode === mode && stored.controlled === controlled;
  const state = sameOwner ? stored : createState();
  const visible = new Map(items.map(item => [definition.key(item), item]));
  // Keep refreshed previews commit-bound. A caller may reconstruct every item on
  // each render, so writing previews into render-phase state would loop.
  const committed = useRef<{
    owner: symbol;
    selection: Selection<T>;
    visible: ReadonlyMap<string, T>;
    retainMissing: boolean;
    mode: typeof mode;
    onValueChange: CollectionOptions['onValueChange'];
  } | null>(null);
  const inputIds = value === undefined ? state.selection.ids : normalizeIds(value, mode);
  let input = state.selection;
  if (retainMissing || controlled) {
    const previews = committed.current?.owner === state.owner
      ? committed.current.selection.retained : state.selection.retained;
    const retained = new Map<string, T>();
    for (const id of inputIds) {
      if (previews.has(id)) retained.set(id, previews.get(id)!);
    }
    input = { ...input, ids: inputIds, retained };
  }
  const selection = pruneSelection(input, visible, retainMissing);
  const localSelection = controlled ? state.selection : selection;
  if (!sameOwner || (!retainMissing &&
    (localSelection !== state.selection || selection.anchor !== state.selection.anchor))) {
    setState({ ...state, selection: { ...localSelection, anchor: selection.anchor } });
  }
  useLayoutEffect(() => {
    committed.current = { owner: state.owner, selection, visible, retainMissing, mode, onValueChange };
  });
  useLayoutEffect(() => () => {
    committed.current = null;
  }, []);
  const selected = selectedItems(selection, visible, retainMissing);
  const ids = selection.ids;
  const change = (
    operation: 'select' | 'unselect' | 'toggle' | 'range' | 'all' | 'clear',
    requested: readonly string[],
    origin?: string,
  ) => {
    const current = committed.current;
    if (!current || current.owner !== state.owner) return;
    const previous = current.selection;
    let targets = requested;
    if (operation === 'range') {
      const target = requested[0];
      if (target === undefined) return;
      targets = rangeKeys([...current.visible.keys()], previous.anchor, target, origin);
    } else if (operation === 'all') {
      const keys = [...current.visible.keys()];
      targets = current.mode === 'single' ? keys.slice(0, 1) : keys;
    }
    const next = operation === 'clear' ? emptySelection<T>() : changeSelection(
      previous, current.visible, targets, operation === 'all' ? 'select' : operation,
      current.retainMissing, current.mode, origin,
    );
    const changed = next.ids.length !== previous.ids.length || next.ids.some((id, index) => id !== previous.ids[index]);
    if (!changed && next.anchor === previous.anchor) return;
    // A controlled owner always reads IDs from its latest committed value.
    const updated = controlled ? { ...previous, anchor: next.anchor } : next;
    current.selection = updated;
    setState(previous => previous.owner === current.owner ? { ...previous, selection: updated } : previous);
    if (changed) current.onValueChange?.(next.ids);
  };
  const toggle = (id: string) => change('toggle', [id]);
  const item = (id: string): CollectionItem => ({
    checked: ids.includes(id), collectionId: domId, key: id,
    toggle: () => toggle(id),
    selectRange: () => mode === 'single' ? change('select', [id]) : change('range', [id]),
    onMouseDown(event) {
      if (mode === 'single' || event.defaultPrevented || !event.shiftKey || interactive(event) || hasTextSelection(event)) return;
      event.preventDefault();
    },
    onClick(event) {
      if (event.defaultPrevented || interactive(event) || hasTextSelection(event)) return;
      if (mode === 'single') {
        event.preventDefault();
        toggle(id);
      } else if (event.shiftKey) {
        event.preventDefault();
        change('range', [id]);
      } else if (event.ctrlKey || event.metaKey || ids.length) {
        event.preventDefault();
        toggle(id);
      } else {
        // The first plain click establishes a selection; subsequent plain
        // clicks toggle while a selection is active.
        event.preventDefault();
        change('select', [id]);
      }
    },
    onKeyDown(event) {
      if (event.defaultPrevented || interactive(event) || hasTextSelection(event)) return;
      if (event.target !== event.currentTarget) return;
      if (mode === 'multiple' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault(); event.stopPropagation(); change('all', []); return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        const root = event.currentTarget.closest('[data-ui-collection]');
        if (root?.getAttribute('data-ui-collection') !== domId) return;
        const nodes = [...root.querySelectorAll<HTMLElement>('[data-ui-collection-item]')].filter(node =>
          node.getAttribute('data-ui-collection-item') === domId && node.getClientRects().length > 0 && !node.closest('[inert]'));
        const index = nodes.indexOf(event.currentTarget);
        if (index < 0) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 :
          Math.max(0, Math.min(nodes.length - 1, index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1)));
        const target = nodes[next];
        const key = target?.getAttribute('data-ui-collection-key');
        if (!target || key == null) return;
        event.preventDefault(); event.stopPropagation(); target.focus();
        if (mode === 'multiple' && event.shiftKey) change('range', [key], id);
        return;
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      event.stopPropagation();
      if (mode === 'multiple' && event.shiftKey) change('range', [id]);
      else toggle(id);
    },
  });
  return {
    token: definition.token, domId, items: [...visible.values()], selected, ids, count: ids.length, item,
    select: id => change('select', [id]),
    unselect: id => change('unselect', [id]),
    toggle,
    selectAll: () => change('all', []),
    clear: () => change('clear', []),
  };
}

type ContextEntry = { collection: CollectionScope; parent: ContextEntry | null };
const Context = createContext<ContextEntry | null>(null);
export function CollectionContext({ collection, children }: { collection: CollectionScope; children: ReactNode }) {
  const parent = useContext(Context);
  return <Context.Provider value={{ collection, parent }}>{children}</Context.Provider>;
}
export function useCollectionItem<T>(definition: CollectionDefinition<T>, id: string): CollectionItem | undefined {
  let entry = useContext(Context);
  while (entry) {
    if (entry.collection.token === definition.token) return entry.collection.item(id);
    entry = entry.parent;
  }
  return undefined;
}
