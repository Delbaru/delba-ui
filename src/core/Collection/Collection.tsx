'use client';

import { createContext, useContext, useState, type MouseEvent, type KeyboardEvent, type ReactNode } from 'react';
import { changeSelection, emptySelection, rangeKeys, selectedItems, type Selection } from './Selection';

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
  const control = target.closest('a,button,input,textarea,select,[role="button"],[contenteditable="true"]');
  return !!control && control !== event.currentTarget;
}

function hasTextSelection(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  return !!event.currentTarget.ownerDocument.defaultView?.getSelection()?.toString();
}

/** Selection is owned by the local instance; the definition never holds user data. */
export function useCollection<T>(
  definition: CollectionDefinition<T>, items: readonly T[],
  options: { scope: string; retainMissing?: boolean },
): CollectionController<T> {
  const { scope, retainMissing = false } = options;
  const [state, setState] = useState<{ scope: string; selection: Selection<T> }>(() => ({
    scope, selection: emptySelection<T>(),
  }));
  const selection = state.scope === scope ? state.selection : emptySelection<T>();
  if (state.scope !== scope) setState({ scope, selection });
  const visible = new Map(items.map(item => [definition.key(item), item]));
  const keys = [...visible.keys()];
  const selected = selectedItems(selection, visible, retainMissing);
  const ids = selection.ids.filter(id => retainMissing || visible.has(id));
  const change = (operation: 'select' | 'unselect' | 'toggle' | 'range', requested: readonly string[]) =>
    setState(previous => ({
      scope,
      selection: changeSelection(previous.scope === scope ? previous.selection : emptySelection<T>(),
        visible, requested, operation, retainMissing),
    }));
  const toggle = (id: string) => change('toggle', [id]);
  const item = (id: string): CollectionItem => ({
    checked: ids.includes(id),
    toggle: () => toggle(id),
    selectRange: () => change('range', rangeKeys(keys, selection.anchor, id)),
    onMouseDown(event) {
      if (event.defaultPrevented || !event.shiftKey || interactive(event) || hasTextSelection(event)) return;
      event.preventDefault();
    },
    onClick(event) {
      if (event.defaultPrevented || interactive(event) || hasTextSelection(event)) return;
      if (event.shiftKey) {
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
      if (event.shiftKey) change('range', rangeKeys(keys, selection.anchor, id));
      else toggle(id);
    },
  });
  return {
    token: definition.token, items: [...visible.values()], selected, ids, count: ids.length, item,
    select: id => change('select', [id]),
    unselect: id => change('unselect', [id]),
    toggle,
    selectAll: () => change('select', keys),
    clear: () => setState({ scope, selection: emptySelection<T>() }),
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
