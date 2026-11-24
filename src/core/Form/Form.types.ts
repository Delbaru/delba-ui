import type { ActionInvocationController } from '../../hooks/useActionInvocation';
import type { FieldName } from './Draft';

export type FormErrors<T extends object> = Partial<Record<FieldName<T>, string>>;

export type FormOptions<T extends object, R> = {
  /** Stable owner identity supplied by the consumer. Never infer a user or session. */
  scope: string;
  preset: 'default' | 'message';
  initial: T;
  draft?: { key: string; persist: readonly FieldName<T>[] };
  disabled?: boolean;
  validate?: (values: T) => FormErrors<T>;
  submit: (values: T) => R | Promise<R>;
  saved?: (result: R, submitted: T) => T;
  /** Submitted array items removed by identity, even after later additions. */
  consume?: readonly FieldName<T>[];
  onSuccess?: (result: R, submitted: T) => void;
  /** Optional adaptation of a rejected command into addressed field errors. */
  errorsFrom?: (error: unknown) => FormErrors<T>;
};

export interface FormScope {
  ready: boolean;
  disabled: boolean;
  readField(name: string): unknown;
  writeField(name: string, value: unknown): void;
  fieldError(name: string): string | undefined;
  submit: ActionInvocationController<[]>['invoke'];
}

export type ActionOptions =
  | { preset: 'default'; run: () => unknown; controller?: never; disabled?: boolean }
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
  reset(): void;
  clear(): void;
  receive(initial: T): void;
  action: ActionOptions;
}
