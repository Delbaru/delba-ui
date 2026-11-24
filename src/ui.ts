import { useActionInvocation } from './hooks/useActionInvocation';
import { useForm, useFormField } from './core/Form';

/** Shared UI mechanisms; product owners supply their own commands and scopes. */
export const ui = {
  form: { use: useForm, field: { use: useFormField } },
  action: { use: useActionInvocation },
};
