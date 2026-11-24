export type FieldName<T extends object> = Extract<keyof T, string>;

function plain(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Plain values compare structurally; opaque objects (including File) by identity. */
export function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
  }
  if (!plain(left) || !plain(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length &&
    keys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

/** Snapshot plain containers without cloning opaque objects or File identity. */
export function snapshotValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(snapshotValue) as T;
  if (plain(value)) return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, snapshotValue(item)]),
  ) as T;
  return value;
}

export function removeSubmitted(current: readonly unknown[], submitted: readonly unknown[]) {
  const remaining = [...submitted];
  return current.filter(item => {
    const index = remaining.findIndex(value => Object.is(value, item));
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}

export type FieldEquality<T extends object> = (field: FieldName<T>, left: T[FieldName<T>], right: T[FieldName<T>]) => boolean;

export type DraftSnapshot<T extends object> = {
  values: T;
  baseline: T;
  revisions: Readonly<Record<string, number | undefined>>;
};

export function createDraft<T extends object>(initial: T): DraftSnapshot<T> {
  return { values: snapshotValue(initial), baseline: snapshotValue(initial), revisions: {} };
}

export function setField<T extends object, K extends FieldName<T>>(
  draft: DraftSnapshot<T>, name: K, value: T[K], changedExternally = false,
): DraftSnapshot<T> {
  if (!changedExternally && sameValue(draft.values[name], value)) return draft;
  return {
    ...draft,
    values: { ...draft.values, [name]: snapshotValue(value) },
    revisions: { ...draft.revisions, [name]: (draft.revisions[name] ?? 0) + 1 },
  };
}

/** Refresh changes untouched fields only. */
export function receiveDraft<T extends object>(draft: DraftSnapshot<T>, initial: T,
  equal: FieldEquality<T> = (_field, left, right) => sameValue(left, right),
): DraftSnapshot<T> {
  let next = draft;
  for (const name of Object.keys(initial) as FieldName<T>[]) {
    if (equal(name, draft.values[name], draft.baseline[name]) || equal(name, draft.values[name], initial[name])) {
      next = setField(next, name, initial[name]);
    }
  }
  return { ...next, baseline: snapshotValue(initial) };
}

/** Acknowledge the submitted version, not a later edit (including change-away-and-back). */
export function acknowledgeDraft<T extends object>(
  current: DraftSnapshot<T>, submitted: DraftSnapshot<T>, saved: T,
  consume: readonly FieldName<T>[] = [],
): DraftSnapshot<T> {
  let next = current;
  for (const name of Object.keys(saved) as FieldName<T>[]) {
    if ((current.revisions[name] ?? 0) === (submitted.revisions[name] ?? 0)) {
      next = setField(next, name, saved[name]);
    } else if (consume.includes(name)) {
      const now = current.values[name];
      const sent = submitted.values[name];
      if (Array.isArray(now) && Array.isArray(sent)) {
        next = setField(next, name, removeSubmitted(now, sent) as T[typeof name]);
      }
    }
  }
  return { ...next, baseline: snapshotValue(saved) };
}

export function resetDraft<T extends object>(draft: DraftSnapshot<T>, values: T): DraftSnapshot<T> {
  let next = draft;
  for (const name of Object.keys(values) as FieldName<T>[]) {
    next = setField(next, name, values[name]);
  }
  return next;
}
