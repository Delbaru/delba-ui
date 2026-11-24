/** Shared admission for explicitly identical operations in one browser realm.
 * No payload, credentials or current-session pointer is retained here.
 */
export function createActionAdmission() {
  const active = new Map<string, symbol>();
  const listeners = new Set<() => void>();
  const scopedListeners = new Map<string, Set<() => void>>();
  const notify = (key: string) => {
    const deliver = (listener: () => void) => {
      try { listener(); }
      catch (error) { console.error('UI admission subscriber failed', error); }
    };
    [...listeners].forEach(deliver);
    [...(scopedListeners.get(key) ?? [])].forEach(deliver);
  };
  return {
    pending: (key: string) => active.has(key),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    subscribeKey(key: string, listener: () => void) {
      const subscribers = scopedListeners.get(key) ?? new Set<() => void>();
      scopedListeners.set(key, subscribers);
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
        if (!subscribers.size && scopedListeners.get(key) === subscribers) scopedListeners.delete(key);
      };
    },
    acquire(key: string): (() => void) | undefined {
      if (active.has(key)) return undefined;
      const ticket = Symbol();
      active.set(key, ticket);
      notify(key);
      return () => {
        if (active.get(key) !== ticket) return;
        active.delete(key);
        notify(key);
      };
    },
  };
}
