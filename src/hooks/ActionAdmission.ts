/** Shared admission for explicitly identical operations in one browser realm.
 * No payload, credentials or current-session pointer is retained here.
 */
export function createActionAdmission() {
  const active = new Map<string, symbol>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    pending: (key: string) => active.has(key),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    acquire(key: string): (() => void) | undefined {
      if (active.has(key)) return undefined;
      const ticket = Symbol();
      active.set(key, ticket);
      notify();
      return () => {
        if (active.get(key) !== ticket) return;
        active.delete(key);
        notify();
      };
    },
  };
}
