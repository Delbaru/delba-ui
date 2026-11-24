'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useActionInvocation } from '../../hooks/useActionInvocation';
import {
  acknowledgeDraft, createDraft, receiveDraft, resetDraft, sameValue, setField, snapshotValue,
  type DraftSnapshot, type FieldName,
} from './Draft';
import { decodeDraft, draftStorageKey, encodeDraft } from './Storage';
import type { FormController, FormErrors, FormOptions } from './Form.types';

type Entry<T extends object> = {
  draft: DraftSnapshot<T>;
  ready: boolean;
  persisted: boolean;
  error: unknown;
};
function hasErrors<T extends object>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

/** A hook owns its form and in-memory drafts; no module-wide user state. */
export function useForm<T extends object, R>(options: FormOptions<T, R>): FormController<T> {
  const { scope, draft, initial } = options;
  const key = draft?.key ?? '';
  const entries = useMemo(() => new Map<string, Entry<T>>(), [scope]);
  const [, render] = useState(0);
  const notify = () => render(value => value + 1);
  const storageKey = draft && scope ? draftStorageKey(scope, key) : undefined;
  const persist = draft?.persist ?? [];
  let existing = entries.get(key);
  if (!existing) {
    existing = { draft: createDraft(initial), ready: !draft, persisted: !draft, error: undefined };
    entries.set(key, existing);
  }
  const entry = existing;
  const current = useRef({ entries, entry });
  current.current = { entries, entry };
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const save = () => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, encodeDraft(entry.draft.values, persist));
      entry.persisted = true;
    } catch {
      entry.persisted = false;
    }
  };

  useEffect(() => {
    if (entry.ready || !storageKey) return;
    try {
      const restored = decodeDraft(localStorage.getItem(storageKey), initial, persist);
      for (const name of Object.keys(restored) as FieldName<T>[]) {
        entry.draft = setField(entry.draft, name, restored[name] as T[typeof name]);
      }
      entry.persisted = true;
    } catch {
      entry.persisted = false;
    }
    entry.ready = true;
    notify();
  }, [entry, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const receive = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
      try {
        const remote = decodeDraft(event.newValue, initial, persist);
        for (const name of persist) {
          if (!sameValue(entry.draft.values[name], entry.draft.baseline[name])) continue;
          const value = Object.hasOwn(remote, name) ? remote[name] : initial[name];
          entry.draft = setField(entry.draft, name, value as T[typeof name]);
        }
        notify();
      } catch {
        entry.persisted = false;
        notify();
      }
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, [entry, storageKey]);

  const disabled = !!options.disabled || !scope;
  const isOwner = () => mounted.current && current.current.entries === entries;
  const isCurrent = () => isOwner() && current.current.entry === entry;
  const set = <K extends FieldName<T>>(name: K, value: T[K]) => {
    if (!isCurrent() || !entry.ready || disabled) return;
    entry.draft = setField(entry.draft, name, value);
    entry.error = undefined;
    save();
    notify();
  };
  const errors = options.validate?.(entry.draft.values) ?? {};
  const valid = !hasErrors(errors);
  const invocation = useActionInvocation({
    identity: JSON.stringify([scope, key]),
    action: async () => {
      if (!isCurrent() || disabled || !entry.ready || hasErrors(options.validate?.(entry.draft.values) ?? {})) return;
      const submitted = snapshotValue(entry.draft);
      entry.error = undefined;
      try {
        const result = await options.submit(submitted.values);
        if (!isOwner()) return;
        const saved = options.saved?.(result, submitted.values) ??
          (options.preset === 'message' ? initial : submitted.values);
        entry.draft = acknowledgeDraft(entry.draft, submitted, saved, options.consume);
        save();
        if (isCurrent()) options.onSuccess?.(result, submitted.values);
      } catch (error) {
        if (!isOwner()) throw new DOMException('Form scope changed', 'AbortError');
        entry.error = error;
        if (!isCurrent()) throw new DOMException('Form scope changed', 'AbortError');
        throw error;
      } finally {
        if (isOwner()) notify();
      }
    },
  });

  const values = entry.draft.values;
  const changes = Object.fromEntries((Object.keys(values) as FieldName<T>[])
    .filter(name => !sameValue(values[name], entry.draft.baseline[name]))
    .map(name => [name, values[name]])) as Partial<T>;
  const dirty = Object.keys(changes).length > 0;
  const replace = (next: DraftSnapshot<T>) => {
    if (!isCurrent() || disabled || !entry.ready) return;
    entry.draft = next;
    entry.error = undefined;
    save();
    notify();
  };

  return {
    values, changes, dirty, valid, errors, disabled, ready: entry.ready,
    error: entry.error, persisted: entry.persisted,
    unsaved: dirty && (!storageKey || !entry.persisted || Object.keys(changes).some(name =>
      !persist.includes(name as FieldName<T>) || typeof values[name as FieldName<T>] !== 'string')),
    loading: invocation.pending,
    set,
    readField: name => Object.hasOwn(values, name) ? values[name as FieldName<T>] : undefined,
    writeField: (name, value) => {
      if (Object.hasOwn(values, name)) set(name as FieldName<T>, value as T[FieldName<T>]);
    },
    fieldError: name => errors[name as FieldName<T>],
    reset: () => replace(resetDraft(entry.draft, entry.draft.baseline)),
    clear: () => replace(resetDraft(entry.draft, initial)),
    receive: next => replace(receiveDraft(entry.draft, next)),
    submit: invocation.invoke,
    action: { preset: 'default', controller: invocation },
  };
}
