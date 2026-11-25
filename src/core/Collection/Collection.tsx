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
  /** Optional for a stable single-owner list; pass a changing owner/query key to reset selection. */
  scope?: string;
  retainMissing?: boolean;
  mode?: 'single' | 'multiple';
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

/** Selection is owned by the local instance; the definition never holds user data. */
export function useCollection<T>(
  definition: CollectionDefinition<T>, items: readonly T[],
  options: CollectionOptions = {},
): CollectionController<T> {
  const { scope = '', retainMissing = false, mode = 'multiple' } = options;
  const domId = useId();
  type State = { scope: string; token: symbol; mode: typeof mode; owner: symbol; selection: Selection<T> };
  const createState = (): State => ({
    scope, token: definition.token, mode, owner: Symbol(), selection: emptySelection<T>(),
  });
  const [stored, setState] = useState<State>(createState);
  const state = stored.scope === scope && stored.token === definition.token && stored.mode === mode
    ? stored : createState();
  const visible = new Map(items.map(item => [definition.key(item), item]));
  // Keep refreshed previews commit-bound. A caller may reconstruct every item on
  // each render, so writing previews into render-phase state would loop.
  const committed = useRef<{ owner: symbol; retained: ReadonlyMap<string, T>; visible: ReadonlyMap<string, T>; retainMissing: boolean; mode: typeof mode } | null>(null);
  const retained = new Map(state.selection.retained);
  if (retainMissing && committed.current?.owner === state.owner) {
    for (const id of state.selection.ids) {
      if (committed.current.retained.has(id)) retained.set(id, committed.current.retained.get(id)!);
    }
  }
  const selection = pruneSelection(
    retainMissing ? { ...state.selection, retained } : state.selection, visible, retainMissing,
  );
  if (state !== stored || !retainMissing && selection !== state.selection) setState({ ...state, selection });
  useLayoutEffect(() => {
    committed.current = { owner: state.owner, retained: selection.retained, visible, retainMissing, mode };
  });
  const selected = selectedItems(selection, visible, retainMissing);
  const ids = selection.ids.filter(id => retainMissing || visible.has(id));
  const change = (operation: 'select' | 'unselect' | 'toggle' | 'range' | 'all', requested: readonly string[], origin?: string) => {
    const current = committed.current;
    if (!current || current.owner !== state.owner) return;
    setState(previous => {
      if (previous.owner !== current.owner) return previous;
      const previews = new Map(previous.selection.retained);
      for (const id of previous.selection.ids) {
        if (current.retained.has(id)) previews.set(id, current.retained.get(id)!);
      }
      const keys = [...current.visible.keys()];
      let targets = requested;
      if (operation === 'range') {
        const target = requested[0];
        if (target === undefined) return previous;
        targets = rangeKeys(keys, previous.selection.anchor, target, origin);
      } else if (operation === 'all') {
        targets = current.mode === 'single' ? keys.slice(0, 1) : keys;
      }
      return { ...previous, selection: changeSelection(
        { ...previous.selection, retained: previews }, current.visible, targets,
        operation === 'all' ? 'select' : operation, current.retainMissing, current.mode, origin,
      ) };
    });
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
    clear: () => setState(previous => previous.owner !== state.owner ? previous : { ...previous, selection: emptySelection<T>() }),
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
