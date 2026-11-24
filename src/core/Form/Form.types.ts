import type { ActionInvocationController } from '../../hooks/useActionInvocation';
import type { FieldName, FieldEquality } from './Draft';

export type FormErrors<T extends object> = Partial<Record<FieldName<T>, string>>;

/** Optional consumer-owned persistence transport; it must be scoped and notify all readers. */
export interface DraftStorage {
  read(): { raw: string | null; persisted: boolean; revision?: number };
  /** Optional owner-guarded compare-and-write after a confirmed message outlives its form. */
  acknowledge?(expectedRevision: number, raw: string): boolean;
  write(raw: string): boolean;
  subscribe(listener: () => void): () => void;
}

export type FormOptions<T extends object, R> = {
  /** Stable owner identity supplied by the consumer. Never infer a user or session. */
  scope: string;
  preset: 'default' | 'message';
  initial: T;
  /** Latest confirmed data, separate from reset/clear defaults. */
  refresh?: T;
  /** Domain-specific equivalence (e.g. normalized decimal input). */
  equal?: FieldEquality<T>;
  draft?: { key: string; persist: readonly FieldName<T>[]; storage?: DraftStorage };
  disabled?: boolean;
  validate?: (values: T) => FormErrors<T>;
  submit: (values: T) => R | Promise<R>;
  /** Consumer-owned abort request; not a server rollback. */
  onCancel?: () => void;
  saved?: (result: R, submitted: T) => T;
  /** Submitted array items removed by identity, even after later additions. */
  consume?: readonly FieldName<T>[];
  onSuccess?: (result: R, submitted: T, current: T) => void;
  /** Optional adaptation of a rejected command into addressed field errors. */
  errorsFrom?: (error: unknown) => FormErrors<T>;
};

export interface FormScope {
  ready: boolean;
  disabled: boolean;
  /** Optional for compatibility with custom scopes; distinguishes an undefined field from an unknown name. */
  hasField?(name: string): boolean;
  readField(name: string): unknown;
  writeField(name: string, value: unknown): void;
  updateField(name: string, change: (previous: unknown) => unknown): void;
  fieldError(name: string): string | undefined;
  submit: ActionInvocationController<[]>['invoke'];
}

export type ActionOptions =
  | { preset: 'default'; run: () => unknown; controller?: never; disabled?: boolean; identity?: string; admissionKey?: string; onSuccess?: () => void; onCancel?: () => void }
  | { preset: 'default'; controller: ActionInvocationController<[]>; run?: never; disabled?: boolean };

export interface FormController<T extends object> extends FormScope {
  values: T;
  changes: Partial<T>;
  dirty: boolean;
  valid: boolean;
  errors: FormErrors<T>;
  error: unknown;
  loading: boolean;
  persisted: boolean;
  unsaved: boolean;
  set<K extends FieldName<T>>(name: K, value: T[K]): void;
  update<K extends FieldName<T>>(name: K, change: (previous: T[K]) => T[K]): void;
  reset(): void;
  clear(): void;
  receive(initial: T): void;
  cancel?: () => boolean;
  action: ActionOptions;
}
