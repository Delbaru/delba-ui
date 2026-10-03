import { createContext, createElement, useContext, useEffect, type ReactNode } from 'react';

/** Ручка доменного блока — набор глаголов поверх дверей кита (`focus`, `reveal`…). */
export type EntityHandle = Record<string, (...args: never[]) => unknown>;

/** Форма реестра: имя сущности → её ручка. Имена сущностей знает продукт, не кит. */
export type HandlesShape = Record<string, EntityHandle>;

export type HandlesRegistry<E extends HandlesShape> = {
  /** Компонент ставит свою ручку на время жизни; возвращает отписку для cleanup-эффекта. */
  register<K extends keyof E & string>(kind: K, id: string, handle: E[K]): () => void;
  /**
   * Глаголы блока снаружи. Блок ещё не смонтирован — вызов дождётся регистрации и исполнится
   * на живой ручке; результат — то, что вернул глагол.
   */
  get<K extends keyof E & string>(kind: K, id: string): E[K];
  /** Регистрация из компонента под `Provider`: ставит ручку при монтировании, снимает при размонтировании. */
  useHandle<K extends keyof E & string>(kind: K, id: string, handle: E[K]): void;
  /** Область действия реестра: компоненты внутри видят его в `useHandle`. */
  Provider(props: { children: ReactNode }): ReactNode;
};

/** Глагол, который дожидается живой ручки и передаёт ей вызов с аргументами. */
type DeferredVerb = (...args: unknown[]) => unknown;

function deferredHandle<T extends EntityHandle>(whenMounted: () => Promise<EntityHandle>): T {
  const verbs = new Map<string, DeferredVerb>();

  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property !== 'string' || property === 'then') return undefined;

      const known = verbs.get(property);
      if (known) return known;

      const verb: DeferredVerb = (...args: unknown[]) =>
        whenMounted().then((handle) => (handle[property] as unknown as DeferredVerb)(...args));
      verbs.set(property, verb);

      return verb;
    },
  });
}

/**
 * Реестр доменных блоков, до которых сверху не дотянуться `ref`-ом: вопрос глубоко в списке,
 * ещё не смонтированный вопрос. Компонент регистрирует ручку (`useHandle` под `Provider`),
 * сценарий зовёт глаголы снаружи (`get`). Атомам кита реестр не нужен — им хватает `ref`.
 */
export function createHandles<E extends HandlesShape>(): HandlesRegistry<E> {
  const mounted = new Map<string, EntityHandle>();
  const pending = new Map<string, Array<(handle: EntityHandle) => void>>();
  const RegistryContext = createContext<HandlesRegistry<E> | null>(null);

  const key = (kind: string, id: string) => `${kind}\u0000${id}`;

  const whenMounted = (kind: string, id: string) =>
    new Promise<EntityHandle>((resolve) => {
      const k = key(kind, id);
      const handle = mounted.get(k);

      if (handle) {
        resolve(handle);
        return;
      }

      pending.set(k, [...(pending.get(k) ?? []), resolve]);
    });

  const registry: HandlesRegistry<E> = {
    register(kind, id, handle) {
      const k = key(kind, id);

      mounted.set(k, handle);
      pending.get(k)?.forEach((run) => run(handle));
      pending.delete(k);

      return () => {
        if (mounted.get(k) === handle) mounted.delete(k);
      };
    },

    get<K extends keyof E & string>(kind: K, id: string) {
      return deferredHandle<E[K]>(() => whenMounted(kind, id));
    },

    useHandle(kind, id, handle) {
      const current = useContext(RegistryContext);

      useEffect(() => current?.register(kind, id, handle), [current, handle, id, kind]);
    },

    Provider({ children }) {
      return createElement(RegistryContext.Provider, { value: registry }, children);
    },
  };

  return registry;
}
