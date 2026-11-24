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
Named Input/Textarea (string), Select (string/null or string array) and Checkbox (boolean) use the nearest compatible form field unless explicitly controlled. The caller's change callback still runs. Custom scopes may expose `hasField` to distinguish an explicitly undefined optional field from an unknown name. Named `Input type="file"` binds a File[] field (native selection replaces the array; FileList is never assigned as a value). Custom append/drop/preview controls can use `ui.form.field.use<File[]>(name)` and its update method. Files never enter browser storage.
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

A consumer may temporarily supply `draft.storage` for a pre-existing shared draft namespace. The adapter implements read/write/subscribe, owns persistence and must scope subscriptions; the form still owns submission/reconciliation and non-persisted values. `form.update(name, change)` and `field.update(change)` operate on the latest value, not a stale rendered array.

For editing records, `refresh` supplies the last confirmed values and preserves dirty fields. `equal` may express domain normalization for dirty/refresh comparisons (e.g. decimal spelling); revision-based acknowledgement still distinguishes edits made after submit. `changes` remains exact field differences for patch construction. The form controller does not decide field permissions.

### Shared admission (stabilization)

Draft forms with the same scoped storage key share one in-process admission ticket through useActionInvocation, including independently mounted surfaces. The ticket lives until actual settlement, not until a component unmounts. Local owner changes do not release that shared ticket. This is not a durable server idempotency receipt and does not coordinate browser tabs. Independent forms without a shared key retain local admission. Browser integration/StrictMode acceptance is still required.

Version-aware adapters may return a monotonically changing `revision` and implement `acknowledge(expectedRevision, raw)` with current-owner validation. Form uses this to retain an externally edited-and-restored value, and to acknowledge an unmounted message form only when its adapter proves the submitted revision is still current. Unversioned adapters cannot safely acknowledge after unmount. A failed default localStorage write must not cause stale disk text to replace an unsaved value at submit.

Shared admission subscriptions are keyed by the exact scoped operation. Local
buttons without a shared admission key do not subscribe to the shared store.

Form draft-key creation replaces the owner map rather than mutating an earlier
render's map. A committed scope token remains stable across draft-key changes.
Storage subscriptions read the latest committed options and ignore callbacks
from a detached key or adapter. These lifecycle paths require browser acceptance.

### Default browser storage
Default drafts notify other mounted forms in the same realm and listen for
cross-tab storage events. Each write carries an opaque version marker alongside
the existing text-only fields, readable by the legacy decoder. An adapter entry
tracks its own revision; equal text after another write does not acknowledge
the old submitted revision. Only string fields can be persisted or restored
(even if a consumer accidentally lists a File field). Failed localStorage
writes keep the local draft unsaved; they do not restore stale disk values.
The default adapter does not acknowledge after unmount because it cannot
prove the original authenticated owner is still active. Explicit guarded
adapters retain that capability. Cross-tab draft sync is not cross-tab
admission, atomic compare-and-swap or durable server idempotency.

Standalone action options may specify `identity`, `admissionKey`,
`onSuccess`, and `onCancel`. Form options also accept `onCancel`.
`cancel?.()` requests the consumer's cooperative abort at most once; it does
not release admission or claim that a server command rolled back. AbortError
is cancellation, not a form validation failure. A nested non-native form
scope inside a native form handles text input Enter locally; custom editors
retain their own key handling. Native submit remains opt-in.
