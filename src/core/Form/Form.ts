'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isAbortActionError } from '../../hooks/action-invocation.model';
import { useActionInvocation } from '../../hooks/useActionInvocation';
import {
  acknowledgeDraft, createDraft, receiveDraft, resetDraft, sameValue, setField, snapshotValue,
  type DraftSnapshot, type FieldName,
} from './Draft';
import { decodeDraft, draftStorageKey, encodeDraft } from './Storage';
import { createBrowserDraftStorage } from './BrowserStorage';
import type { DraftStorage, FormController, FormErrors, FormOptions } from './Form.types';

type Entry<T extends object> = {
  draft: DraftSnapshot<T>;
  ready: boolean;
  persisted: boolean;
  error: unknown;
  storageKey?: string;
  persist: readonly FieldName<T>[];
  lastReceived?: T;
  storageRevision?: number;
  persistedText?: string;
  browserStorage?: DraftStorage;
};
function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}

/** A hook owns its form and in-memory drafts; no module-wide user state. */
export function useForm<T extends object, R>(options: FormOptions<T, R>): FormController<T> {
  const { scope, draft, initial } = options;
  const key = draft?.key ?? '';
  type Owner = { scope: string; token: symbol; entries: Map<string, Entry<T>> };
  const createOwner = (): Owner => ({ scope, token: Symbol(), entries: new Map() });
  const [storedOwner, setOwner] = useState<Owner>(createOwner);
  const owner = storedOwner.scope === scope ? storedOwner : createOwner();
  const [, render] = useState(0);
  const notify = () => render(value => value + 1);
  const storageKey = draft && scope ? draftStorageKey(scope, key) : undefined;
  const persist = (draft?.persist ?? []).filter(name => typeof initial[name] === 'string');
  const existing = owner.entries.get(key);
  const entry: Entry<T> = existing ?? {
    draft: createDraft(initial), ready: !draft, persisted: !draft, error: undefined, storageKey, persist,
    browserStorage: storageKey ? createBrowserDraftStorage(storageKey) : undefined,
  };
  const storage = draft?.storage ?? entry.browserStorage;
  const browserStorage = storage === entry.browserStorage;
  // A render may be interrupted. Do not mutate the previously committed owner map.
  const entries = existing ? owner.entries : new Map(owner.entries).set(key, entry);
  if (owner !== storedOwner || entries !== owner.entries) setOwner({ ...owner, entries });
  const current = useRef({ owner: owner.token, entry });
  useLayoutEffect(() => { current.current = { owner: owner.token, entry }; }, [owner.token, entry]);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const save = () => {
    if (!storageKey || !storage) return;
    try {
      const raw = encodeDraft(entry.draft.values, persist);
      if (browserStorage && entry.persisted && raw === entry.persistedText) return;
      entry.persisted = storage.write(raw);
      if (entry.persisted && browserStorage) entry.persistedText = raw;
      if (entry.persisted || !browserStorage) entry.storageRevision = storage.read().revision;
    } catch {
      entry.persisted = false;
    }
  };

  const readStored = (restore: boolean) => {
    if (!storageKey || !storage || (browserStorage && !restore && !entry.persisted)) return;
    try {
      const stored = storage.read();
      if (browserStorage && !stored.persisted) { entry.persisted = false; return; }
      const remote = decodeDraft(stored.raw, initial, persist);
      if (browserStorage && stored.persisted) entry.persistedText = encodeDraft({ ...initial, ...remote }, persist);
      const revision = stored.revision;
      const changedExternally = entry.storageRevision !== undefined && revision !== undefined && revision !== entry.storageRevision;
      for (const name of persist) {
        // Shared message drafts intentionally reflect the same owner's other surface.
        // Edit forms preserve local dirty fields on external refresh.
        if (!restore && options.preset !== 'message' &&
          !sameValue(entry.draft.values[name], entry.draft.baseline[name])) continue;
        const value = Object.hasOwn(remote, name) ? remote[name] : initial[name];
        entry.draft = setField(entry.draft, name, value as T[typeof name], changedExternally);
      }
      entry.persisted = stored.persisted;
      entry.storageRevision = revision;
    } catch {
      entry.persisted = false;
    }
  };

  // Storage listeners follow the latest committed options, not the render in
  // which the subscription was first established.
  const subscription = useRef<{
    entry: Entry<T>; storageKey: string | undefined; storage: DraftStorage | undefined;
    read: (restore: boolean) => void;
  } | null>(null);
  useLayoutEffect(() => {
    subscription.current = { entry, storageKey, storage, read: readStored };
    return () => { subscription.current = null; };
  });

  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    const read = (restore: boolean) => {
      const latest = subscription.current;
      if (!active || !latest || latest.entry !== entry ||
          latest.storageKey !== storageKey || latest.storage !== storage) return false;
      latest.read(restore);
      return true;
    };
    if (!read(!entry.ready)) return;
    entry.ready = true;
    notify();
    const receive = () => {
      if (read(false)) notify();
    };
    if (!storage) return;
    const unsubscribe = storage.subscribe(receive);
    return () => { active = false; unsubscribe(); };
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
  const isOwner = () => mounted.current && current.current.owner === owner.token;
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
    admissionKey: storageKey,
    onCancel: options.onCancel,
    action: async () => {
      if (!isCurrent() || disabled || !entry.ready) return;
      if (storageKey) readStored(false);
      if (hasErrors(options.validate?.(entry.draft.values) ?? {})) return;
      const submitted = snapshotValue(entry.draft);
      const submittedRevision = entry.storageRevision;
      entry.error = undefined;
      try {
        const result = await options.submit(submitted.values);
        if (!isOwner()) {
          // Only an explicit, session-guarded adapter may acknowledge after unmount.
          // Never restore a closed form or erase a later revision of shared text.
          if (!mounted.current && options.preset === 'message' && submittedRevision !== undefined) {
            try { storage?.acknowledge?.(submittedRevision, encodeDraft(initial, persist)); }
            catch (error) { console.error('Draft acknowledgement failed', error); }
          }
          return;
        }
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
        if (!isAbortActionError(error)) entry.error = error;
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
    if (storageKey) readStored(false);
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
    hasField: name => Object.hasOwn(values, name),
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
    cancel: invocation.cancel,
    action: { preset: 'default', controller: { pending: invocation.pending, invoke: submit, cancel: invocation.cancel }, disabled: disabled || !entry.ready || !valid },
  };
}
