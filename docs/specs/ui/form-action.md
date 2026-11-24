# Form and action

Pilot API. Runtime acceptance in consuming applications is still required.

```tsx
const form = ui.form.use({
  scope: ownerScope,
  preset: 'default',
  initial: { title: '' },
  validate: values => values.title.trim() ? {} : { title: 'Required' },
  submit: values => save(values),
});
return (
  <Flex as="form" dir={['column', 'column', 'column']} ui={{ form }}>
    <Input name="title" />
    <Button type="submit" ui={{ action: form.action }}>Save</Button>
  </Flex>
);
```

The owner supplies a trusted scope and optional draft key; no global form data.
`form.action` references the same action controller as `form.submit`. A button may
also use `ui={{ action: { preset: 'default', run: command } }}` for a standalone
operation. Do not provide both onClick and ui.action for the same command.
A named Input/Textarea uses its nearest form unless explicitly controlled.
Custom fields use `ui.form.field.use<T>(name)`; native submit is opt-in with
Flex as="form", and editors with their own Enter semantics call form.submit.

`reset` restores the acknowledged baseline; `clear` restores initial values.
`receive` refreshes untouched fields. The message preset clears acknowledged
values to initial; explicit consume fields remove submitted array items by identity.
Only explicitly selected strings enter localStorage; other values remain in
memory. Scope changes isolate owner state; changing a draft key within the same
hook instance retains in-memory drafts. An in-flight submit keeps its ticket during a draft-key change; a late result can acknowledge its original draft only. Storage failure is observable as persisted=false.
Field validation is supplied by the consumer; submission errors use the existing
ActionInvocationProvider and are retained on the form. Never infer authorization.

Tests: root tests/Form/unit/Draft.test.ts covers pure reconciliation and storage.
Browser and React integration acceptance, scope lifetime, nested forms,
native submit, accessibility and consumer compile must still be verified.
