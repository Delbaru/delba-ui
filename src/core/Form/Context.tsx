'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { FormScope } from './Form.types';

const Context = createContext<FormScope | null>(null);

/** Native constraints keep their browser focus; custom errors use the first
 * actual named control in this scope, never a nested form's matching name.
 */
export function focusFormError(root: HTMLElement, form: FormScope) {
  const focusable = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';
  for (const field of root.querySelectorAll<HTMLElement>('[name], [data-ui-form-field]')) {
    const name = field.getAttribute('data-ui-form-field') ?? field.getAttribute('name');
    if (!name || !form.fieldError(name) || field.closest('[data-ui-form-scope]') !== root ||
        field.matches(':disabled, [readonly], [type="hidden"]') || field.closest('[inert], [hidden]')) continue;
    const controls = field.matches(focusable) ? [field] : field.querySelectorAll<HTMLElement>(focusable);
    for (const control of controls) {
      if (control.matches(':disabled, [readonly], [type="hidden"], [aria-disabled="true"]') ||
          control.closest('[inert], [hidden]') || control.closest('[data-ui-form-scope]') !== root) continue;
      control.focus();
      if (control.ownerDocument.activeElement === control) return;
    }
  }
}

/** React context only: does not add a DOM wrapper. */
export function FormContext({ form, children }: { form: FormScope; children: ReactNode }) {
  return <Context.Provider value={form}>{children}</Context.Provider>;
}

/** Internal composition: native submit buttons use the nearest form owner. */
export function useFormScope() {
  return useContext(Context);
}

/** Explicitly controlled fields can opt out of their nearest form. */
export function useFormField<T>(name?: string) {
  const form = useFormScope();
  if (!form || !name) return undefined;
  const value = form.readField(name);
  if (form.hasField ? !form.hasField(name) : value === undefined) return undefined;
  return {
    value: value as T,
    error: form.fieldError(name),
    disabled: form.disabled || !form.ready,
    change: (value: T) => form.writeField(name, value),
    update: (change: (previous: T) => T) => form.updateField(name, previous => change(previous as T)),
    submit: form.submit,
  };
}
