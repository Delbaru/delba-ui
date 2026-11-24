'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  storageKey?: string;
  persist: readonly FieldName<T>[];
  lastReceived?: T;
};
function hasErrors(errors: object): boolean {
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
  const storage = draft?.storage;
  const persist = draft?.persist ?? [];
  let existing = entries.get(key);
  if (!existing) {
    existing = { draft: createDraft(initial), ready: !draft, persisted: !draft, error: undefined, storageKey, persist };
    entries.set(key, existing);
  }
  const entry = existing;
  const current = useRef({ entries, entry });
  useLayoutEffect(() => { current.current = { entries, entry }; }, [entries, entry]);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const save = () => {
    if (!storageKey) return;
    try {
      const raw = encodeDraft(entry.draft.values, persist);
      if (storage) entry.persisted = storage.write(raw);
      else {
        localStorage.setItem(storageKey, raw);
        entry.persisted = true;
      }
    } catch {
      entry.persisted = false;
    }
  };

  const readStored = (restore: boolean) => {
    if (!storageKey) return;
    try {
      const stored = storage?.read() ?? { raw: localStorage.getItem(storageKey), persisted: true };
      const remote = decodeDraft(stored.raw, initial, persist);
      for (const name of persist) {
        // Shared message drafts intentionally reflect the same owner's other surface.
        // Edit forms preserve local dirty fields on external refresh.
        if (!restore && options.preset !== 'message' &&
          !sameValue(entry.draft.values[name], entry.draft.baseline[name])) continue;
        const value = Object.hasOwn(remote, name) ? remote[name] : initial[name];
        entry.draft = setField(entry.draft, name, value as T[typeof name]);
      }
      entry.persisted = stored.persisted;
    } catch {
      entry.persisted = false;
    }
  };

  useEffect(() => {
    if (!storageKey) return;
    readStored(!entry.ready);
    entry.ready = true;
    notify();
    const receive = () => {
      readStored(false);
      notify();
    };
    // The owner of a compatibility storage adapter also owns same-tab subscriptions.
    if (storage) return storage.subscribe(receive);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      try {
        if (event.storageArea === localStorage) receive();
      } catch { entry.persisted = false; notify(); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [entry, storageKey, storage]);

  useEffect(() => {
    const incoming = options.refresh;
    if (!incoming || sameValue(entry.lastReceived, incoming)) return;
    entry.lastReceived = snapshotValue(incoming);
    entry.draft = receiveDraft(entry.draft, incoming, options.equal);
    notify();
  }, [entry, options.refresh, options.equal]);

  const equal = options.equal ?? ((_field: FieldName<T>, left: T[FieldName<T>], right: T[FieldName<T>]) => sameValue(left, right));
  const disabled = !!options.disabled || !scope;
  const isOwner = () => mounted.current && current.current.entries === entries;
  const isCurrent = () => isOwner() && current.current.entry === entry;
  const set = <K extends FieldName<T>>(name: K, value: T[K]) => {
    if (!isCurrent() || !entry.ready || disabled) return;
    if (storage) readStored(false);
    entry.draft = setField(entry.draft, name, value);
    entry.error = undefined;
    save();
    notify();
  };
  const clientErrors: FormErrors<T> = options.validate?.(entry.draft.values) ?? {};
  const serverErrors = entry.error === undefined ? undefined : options.errorsFrom?.(entry.error);
  const errors: FormErrors<T> = { ...serverErrors, ...clientErrors };
  const valid = !hasErrors(clientErrors);
  const invocation = useActionInvocation({
    // Switching rooms does not release the active ticket. The old request may still commit.
    identity: scope,
    action: async () => {
      if (!isCurrent() || disabled || !entry.ready) return;
      if (storage) readStored(false);
      if (hasErrors(options.validate?.(entry.draft.values) ?? {})) return;
      const submitted = snapshotValue(entry.draft);
      entry.error = undefined;
      try {
        const result = await options.submit(submitted.values);
        if (!isOwner()) return;
        const saved = options.saved?.(result, submitted.values) ??
          (options.preset === 'message' ? initial : submitted.values);
        // A second surface may have changed persisted text while the request was in flight.
        if (storage) readStored(false);
        entry.draft = acknowledgeDraft(entry.draft, submitted, saved, options.consume);
        save();
        if (isCurrent()) {
          try { options.onSuccess?.(result, submitted.values, entry.draft.values); }
          catch (error) { console.error('Form acknowledgement callback failed', error); }
        }
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
  const dirty = (Object.keys(values) as FieldName<T>[]).some(name => !equal(name, values[name], entry.draft.baseline[name]));
  const replace = (next: DraftSnapshot<T>) => {
    if (!isCurrent() || disabled || !entry.ready) return;
    entry.draft = next;
    entry.error = undefined;
    save();
    notify();
  };

  const submit = () => {
    if (!isCurrent() || disabled || !entry.ready) return undefined;
    if (storage) readStored(false);
    if (hasErrors(options.validate?.(entry.draft.values) ?? {})) { notify(); return undefined; }
    return invocation.invoke();
  };
  const unsaved = [...entries.values()].some(target =>
    (Object.keys(target.draft.values) as FieldName<T>[]).some(name => {
      const value = target.draft.values[name];
      if (equal(name, value, target.draft.baseline[name])) return false;
      return !target.storageKey || !target.persisted || !target.persist.includes(name) || typeof value !== 'string';
    }),
  );

  return {
    values, changes, dirty, valid, errors, disabled, ready: entry.ready,
    error: entry.error, persisted: entry.persisted,
    unsaved,
    loading: invocation.pending,
    set,
    update: (name, change) => {
      if (storage && isCurrent()) readStored(false);
      set(name, change(entry.draft.values[name]));
    },
    readField: name => Object.hasOwn(values, name) ? values[name as FieldName<T>] : undefined,
    writeField: (name, value) => {
      if (Object.hasOwn(values, name)) set(name as FieldName<T>, value as T[FieldName<T>]);
    },
    updateField: (name, change) => {
      if (!Object.hasOwn(entry.draft.values, name)) return;
      const field = name as FieldName<T>;
      if (storage && isCurrent()) readStored(false);
      set(field, change(entry.draft.values[field]) as T[typeof field]);
    },
    fieldError: name => errors[name as FieldName<T>],
    reset: () => replace(resetDraft(entry.draft, entry.draft.baseline)),
    clear: () => replace(resetDraft(entry.draft, initial)),
    receive: next => replace(receiveDraft(entry.draft, next, options.equal)),
    submit,
    action: { preset: 'default', controller: { pending: invocation.pending, invoke: submit }, disabled: disabled || !entry.ready || !valid },
  };
}
