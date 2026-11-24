import type { DraftStorage } from './Form.types';
import { versionDraft } from './Storage';

type Subscriber = { owner: symbol; notify(): void };
// Only listeners, not draft payloads or user/session state, are shared.
const subscribers = new Map<string, Set<Subscriber>>();

/** One adapter per form draft entry. Its revision is monotonic within that
 * entry, including equal text written as a new version by another surface.
 */
export function createBrowserDraftStorage(key: string): DraftStorage {
  const owner = Symbol();
  let previous: string | null | undefined;
  let revision = 0;
  function observe(raw: string | null) {
    if (previous !== raw) {
      previous = raw;
      revision++;
    }
  }
  return {
    read() {
      try {
        const raw = window.localStorage.getItem(key);
        observe(raw);
        return { raw, persisted: true, revision };
      } catch {
        return { raw: null, persisted: false, revision };
      }
    },
    write(raw) {
      try {
        const version = window.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
        const stored = versionDraft(raw, version);
        window.localStorage.setItem(key, stored);
        observe(stored);
        for (const listener of [...(subscribers.get(key) ?? [])]) {
          if (listener.owner === owner) continue;
          try { listener.notify(); }
          catch (error) { console.error('Draft subscriber failed', error); }
        }
        return true;
      } catch {
        return false;
      }
    },
    subscribe(notify) {
      const listener = { owner, notify };
      const group = subscribers.get(key) ?? new Set<Subscriber>();
      subscribers.set(key, group);
      group.add(listener);
      const receive = (event: StorageEvent) => {
        if (event.key !== key && event.key !== null) return;
        try {
          if (event.storageArea !== window.localStorage) return;
          observe(event.newValue);
        } catch {
          // The form reports persistence failure on its next read.
        }
        notify();
      };
      window.addEventListener('storage', receive);
      return () => {
        window.removeEventListener('storage', receive);
        group.delete(listener);
        if (!group.size && subscribers.get(key) === group) subscribers.delete(key);
      };
    },
    // No acknowledge after unmount: a browser adapter alone cannot prove that
    // the initiating authenticated owner is still active.
  };
}
