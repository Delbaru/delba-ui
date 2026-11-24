import type { FieldName } from './Draft';

/** Only explicitly selected text fields may enter durable storage. */
export function draftStorageKey(scope: string, key: string): string {
  return 'delba.ui.form.v1:' + JSON.stringify([scope, key]);
}

export function encodeDraft<T extends object>(values: T, fields: readonly FieldName<T>[]): string {
  return JSON.stringify(Object.fromEntries(fields.flatMap(name => {
    const value = values[name];
    return typeof value === 'string' ? [[name, value]] : [];
  })));
}

export function decodeDraft<T extends object>(
  raw: string | null, initial: T, fields: readonly FieldName<T>[],
): Partial<T> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const source = parsed as Record<string, unknown>;
  return Object.fromEntries(fields.flatMap(name =>
    Object.hasOwn(source, name) && typeof initial[name] === 'string' && typeof source[name] === 'string'
      ? [[name, source[name]]]
      : [],
  )) as Partial<T>;
}

/** Add an opaque write identity without changing the legacy text-field format.
 * Choose a free key so even a field named like our metadata remains intact.
 */
export function versionDraft(raw: string, version: string): string {
  const fields = JSON.parse(raw) as Record<string, unknown>;
  let key = '$delbaDraftVersion';
  while (Object.hasOwn(fields, key)) key += '$';
  return JSON.stringify({ ...fields, [key]: { version } });
}
