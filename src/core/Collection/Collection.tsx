'use client';

import { createContext, useContext, useState, type MouseEvent, type KeyboardEvent, type ReactNode } from 'react';
import { changeSelection, emptySelection, pruneSelection, rangeKeys, selectedItems, type Selection } from './Selection';

export type CollectionDefinition<T> = {
  readonly token: symbol;
  readonly key: (item: T) => string;
};

export interface CollectionItem {
  checked: boolean;
  toggle(): void;
  selectRange(): void;
  onMouseDown(event: MouseEvent<HTMLElement>): void;
  onClick(event: MouseEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

export interface CollectionScope {
  token: symbol;
  item(id: string): CollectionItem;
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

export function defineCollection<T>(name: string, key: (item: T) => string): CollectionDefinition<T> {
  return { token: Symbol(name), key };
}

function interactive(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
  const target = event.target as Element | null;
  if (!target?.closest) return false;
  if (!event.currentTarget.contains(target)) return true;
  const nested = target.closest('[data-ui-selectable]');
  if (nested && nested !== event.currentTarget && event.currentTarget.contains(nested)) return true;
  const control = target.closest('a,button,input,textarea,select,label,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"])');
  return !!control && control !== event.currentTarget;
}

function hasTextSelection(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  return !!event.currentTarget.ownerDocument.defaultView?.getSelection()?.toString();
}

/** Selection is owned by the local instance; the definition never holds user data. */
export function useCollection<T>(
  definition: CollectionDefinition<T>, items: readonly T[],
  options: { scope: string; retainMissing?: boolean; mode?: 'single' | 'multiple' },
): CollectionController<T> {
  const { scope, retainMissing = false, mode = 'multiple' } = options;
  type State = { scope: string; token: symbol; mode: typeof mode; owner: symbol; selection: Selection<T> };
  const createState = (): State => ({
    scope, token: definition.token, mode, owner: Symbol(), selection: emptySelection<T>(),
  });
  const [stored, setState] = useState<State>(createState);
  const state = stored.scope === scope && stored.token === definition.token && stored.mode === mode
    ? stored : createState();
  const visible = new Map(items.map(item => [definition.key(item), item]));
  const selection = pruneSelection(state.selection, visible, retainMissing);
  if (state !== stored || selection !== state.selection) setState({ ...state, selection });
  const keys = [...visible.keys()];
  const selected = selectedItems(selection, visible, retainMissing);
  const ids = selection.ids.filter(id => retainMissing || visible.has(id));
  const change = (operation: 'select' | 'unselect' | 'toggle' | 'range', requested: readonly string[]) =>
    setState(previous => previous.owner !== state.owner ? previous : {
      ...previous,
      selection: changeSelection(previous.selection, visible, requested, operation, retainMissing, mode),
    });
  const toggle = (id: string) => change('toggle', [id]);
  const item = (id: string): CollectionItem => ({
    checked: ids.includes(id),
    toggle: () => toggle(id),
    selectRange: () => mode === 'single' ? change('select', [id]) : change('range', rangeKeys(keys, selection.anchor, id)),
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
        change('range', rangeKeys(keys, selection.anchor, id));
      } else if (event.ctrlKey || event.metaKey || ids.length) {
        event.preventDefault();
        toggle(id);
      }
    },
    onKeyDown(event) {
      if (event.defaultPrevented || interactive(event) || hasTextSelection(event)) return;
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      event.stopPropagation();
      if (mode === 'multiple' && event.shiftKey) change('range', rangeKeys(keys, selection.anchor, id));
      else toggle(id);
    },
  });
  return {
    token: definition.token, items: [...visible.values()], selected, ids, count: ids.length, item,
    select: id => change('select', [id]),
    unselect: id => change('unselect', [id]),
    toggle,
    selectAll: () => change('select', mode === 'single' ? keys.slice(0, 1) : keys),
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
