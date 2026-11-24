'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { FormScope } from './Form.types';

const Context = createContext<FormScope | null>(null);

/** React context only: does not add a DOM wrapper. */
export function FormContext({ form, children }: { form: FormScope; children: ReactNode }) {
  return <Context.Provider value={form}>{children}</Context.Provider>;
}

/** Explicitly controlled fields can opt out of their nearest form. */
export function useFormField<T>(name?: string) {
  const form = useContext(Context);
  if (!form || !name) return undefined;
  const value = form.readField(name);
  if (value === undefined) return undefined;
  return {
    value: value as T,
    error: form.fieldError(name),
    disabled: form.disabled || !form.ready,
    change: (value: T) => form.writeField(name, value),
    update: (change: (previous: T) => T) => form.updateField(name, previous => change(previous as T)),
    submit: form.submit,
  };
}
