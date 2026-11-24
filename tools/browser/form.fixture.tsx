import { StrictMode, useMemo, useRef, useState } from 'react';
import type { DraftStorage } from '../../src/core/Form/Form.types';
import { ui } from '../../src/ui';
import { Button } from '../../src/components/Button/Button';
import { Flex } from '../../src/components/Flex/Flex';
import { Input } from '../../src/components/Input/Input';
import { Checkbox } from '../../src/components/Checkbox/Checkbox';
import { Select } from '../../src/components/Select/Select';
import { Textarea } from '../../src/components/Textarea/Textarea';
import { ActionInvocationProvider } from '../../src/hooks/useActionInvocation';

const initialMessage = { text: '', files: [] as File[] };
const initialEdit = { title: 'Original', note: 'Note' };

function FilesField() {
  const field = ui.form.field.use<File[]>('files');
  return (
    <input type="file" aria-label="Form attachments" multiple disabled={!field || field.disabled}
      onChange={event => {
        if (field) field.change([...field.value, ...Array.from(event.currentTarget.files ?? [])]);
        event.currentTarget.value = '';
      }} />
  );
}

function MessageForm() {
  const [scope, setScope] = useState('owner-a');
  const [room, setRoom] = useState('room-a');
  const [calls, setCalls] = useState(0);
  const finish = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const form = ui.form.use({
    scope,
    preset: 'message',
    initial: initialMessage,
    draft: { key: 'form-browser:' + room, persist: ['text'] },
    consume: ['files'],
    validate: values => values.text.trim() || values.files.length ? {} : { text: 'Required' },
    submit: () => {
      setCalls(value => value + 1);
      return new Promise<void>((resolve, reject) => { finish.current = { resolve, reject }; });
    },
  });

  return (
    <section aria-label="Message form pilot">
      <Flex as="form" ui={{ form }} dir={['column', 'column', 'column']} gap={[8, 8, 8]}>
        <Input name="text" aria-label="Form message" errorPlacement="below" />
        <FilesField />
        <output data-testid="form-files">{form.values.files.map(file => file.name).join(',')}</output>
        <Button type="submit" ui={{ action: form.action }}>Submit message</Button>
        <output data-testid="form-error">{form.error instanceof Error ? form.error.message : ''}</output>
      </Flex>
      <output data-testid="form-calls">{calls}</output>
      <Button onClick={() => finish.current?.resolve()}>Confirm message</Button>
      <Button onClick={() => finish.current?.reject(new Error('Send rejected'))}>Reject message</Button>
      <Button onClick={() => setRoom(value => value === 'room-a' ? 'room-b' : 'room-a')}>Switch room</Button>
      <Button onClick={() => setScope(value => value === 'owner-a' ? 'owner-b' : 'owner-a')}>Switch owner</Button>
    </section>
  );
}

function EditForm() {
  const [calls, setCalls] = useState(0);
  const [nativeSubmits, setNativeSubmits] = useState(0);
  const [blockSubmit, setBlockSubmit] = useState(false);
  const finish = useRef<(() => void) | null>(null);
  const form = ui.form.use({
    scope: 'edit-owner',
    preset: 'default',
    initial: initialEdit,
    validate: values => values.title.trim() ? {} : { title: 'Required' },
    submit: values => {
      setCalls(value => value + 1);
      return new Promise<typeof initialEdit>(resolve => {
        finish.current = () => resolve({ ...values, title: values.title.toUpperCase() });
      });
    },
    saved: result => result,
  });
  const nested = ui.form.use({
    scope: 'nested-owner',
    preset: 'default',
    initial: { title: 'Nested' },
    submit: () => undefined,
  });

  return (
    <section aria-label="Edit form pilot">
      <Flex as="form" ui={{ form }} dir={['column', 'column', 'column']} gap={[8, 8, 8]}
        onSubmit={event => {
          setNativeSubmits(value => value + 1);
          if (blockSubmit) event.preventDefault();
        }}>
        <Input name="title" aria-label="Edit title" errorPlacement="below" />
        <Textarea name="note" aria-label="Edit note" />
        <Flex ui={{ form: nested }} dir={['column', 'column', 'column']}>
          <Input name="title" aria-label="Nested title" />
        </Flex>
        <Button type="submit" ui={{ action: form.action }}>Save edit</Button>
      </Flex>
      <output data-testid="edit-calls">{calls}</output>
      <output data-testid="native-edit-submits">{nativeSubmits}</output>
      <Button onClick={() => setBlockSubmit(value => !value)}>Toggle edit submit guard</Button>
      <output data-testid="edit-dirty">{String(form.dirty)}</output>
      <Button onClick={() => finish.current?.()}>Confirm edit</Button>
      <Button onClick={form.reset}>Reset edit</Button>
      <Button onClick={form.clear}>Clear edit</Button>
    </section>
  );
}


function SharedSurface({ label, storage, submit }: {
  label: string; storage: DraftStorage; submit: () => Promise<void>;
}) {
  const form = ui.form.use({
    scope: 'shared-owner', preset: 'message', initial: initialMessage,
    draft: { key: 'shared-room', persist: ['text'], storage },
    consume: ['files'],
    validate: values => values.text.trim() ? {} : { text: 'Required' },
    submit,
  });
  return (
    <Flex as="form" ui={{ form }} dir={['column', 'column', 'column']}>
      <Input name="text" aria-label={label + ' text'} />
      <Button type="submit" ui={{ action: form.action }}>{label} send</Button>
    </Flex>
  );
}

function SharedForms() {
  const [first, showFirst] = useState(true);
  const [calls, setCalls] = useState(0);
  const finish = useRef<(() => void) | null>(null);
  const storage = useMemo<DraftStorage>(() => {
    let raw = '{"text":""}';
    let revision = 0;
    const listeners = new Set<() => void>();
    const write = (next: string) => {
      if (raw !== next) { raw = next; revision++; }
      listeners.forEach(listener => listener());
      return true;
    };
    return {
      read: () => ({ raw, revision, persisted: true }),
      write,
      acknowledge: (expected, next) => expected === revision && write(next),
      subscribe: listener => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
    };
  }, []);
  const submit = () => {
    setCalls(value => value + 1);
    return new Promise<void>(resolve => { finish.current = resolve; });
  };
  return (
    <section aria-label="Shared form surfaces">
      {first && <SharedSurface label="First surface" storage={storage} submit={submit} />}
      <SharedSurface label="Second surface" storage={storage} submit={submit} />
      <output data-testid="shared-calls">{calls}</output>
      <Button onClick={() => showFirst(value => !value)}>Toggle first surface</Button>
      <Button onClick={() => finish.current?.()}>Confirm shared message</Button>
    </section>
  );
}

function SubscriptionForm() {
  const [initialText, setInitialText] = useState('Initial');
  const storage = useMemo<DraftStorage>(() => {
    let raw: string | null = null;
    const listeners = new Set<() => void>();
    return {
      read: () => ({ raw, persisted: true }),
      write: next => {
        raw = next;
        listeners.forEach(listener => listener());
        return true;
      },
      subscribe: listener => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
    };
  }, []);
  const form = ui.form.use({
    scope: 'subscription-owner',
    preset: 'message',
    initial: { text: initialText },
    draft: { key: 'subscription-room', persist: ['text'], storage },
    submit: () => undefined,
  });
  return (
    <section aria-label="Subscription form">
      <Flex ui={{ form }}>
        <Input name="text" aria-label="Subscription text" />
      </Flex>
      <Button onClick={() => setInitialText('Latest')}>Change subscription default</Button>
      <Button onClick={() => storage.write('{}')}>Remove subscription text</Button>
    </section>
  );
}

export function FormFixture() {
  return (
    <ActionInvocationProvider onFailure={() => undefined}>
      <MessageForm />
      <NamedFieldsFixture />
      <EditForm />
      <ActionKeyFixture />
      <StrictMode><SharedForms /><SubscriptionForm /></StrictMode>
    </ActionInvocationProvider>
  );
}

/** Real primitive integration: controller owns choice values and File identity. */
function NamedFieldsFixture() {
  const [disabled, setDisabled] = useState(false);
  const [updates, setUpdates] = useState(0);
  const retainedUpdate = useRef<(() => void) | null>(null);
  const form = ui.form.use({
    scope: 'named-fields-fixture',
    preset: 'default',
    disabled,
    initial: { enabled: false, category: null as string | null, tags: [] as string[], files: [] as File[] },
    submit: values => values,
  });
  const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
  return (
    <Flex ui={{ form }} dir={['column', 'column', 'column']}>
      <Checkbox name="enabled" aria-label="Named checkbox" />
      <Select name="category" aria-label="Named category" options={options} />
      <Select multiple name="tags" aria-label="Named tags" options={options} />
      <Input type="file" name="files" multiple aria-label="Named files" />
      <output data-testid="named-values">{JSON.stringify({
        ...form.values, files: form.values.files.map(file => file.name),
      })}</output>
      <Button onClick={form.reset}>Reset named fields</Button>
      <Button onClick={() => {
        retainedUpdate.current = () => form.update('enabled', previous => {
          setUpdates(count => count + 1);
          return !previous;
        });
      }}>Capture named update</Button>
      <Button onClick={() => setDisabled(value => !value)}>Toggle named disabled</Button>
      <Button onClick={() => retainedUpdate.current?.()}>Invoke captured named update</Button>
      <output data-testid="named-updates">{updates}</output>
    </Flex>
  );
}


function ActionKeyFixture() {
  const [key, setKey] = useState('a');
  const [settled, setSettled] = useState(0);
  const [success, setSuccess] = useState(0);
  const finish = useRef<(() => void) | null>(null);
  const action = ui.action.use({
    identity: 'action-key-fixture', admissionKey: key,
    action: () => new Promise<void>(resolve => { finish.current = resolve; }),
    onSettled: () => setSettled(value => value + 1),
    onSuccess: () => setSuccess(value => value + 1),
  });
  return (
    <section aria-label="Action key fixture">
      <Button ui={{ action: { preset: 'default', controller: action } }}>Start keyed action</Button>
      <Button onClick={() => setKey(value => value === 'a' ? 'b' : 'a')}>Switch action key</Button>
      <Button onClick={() => finish.current?.()}>Resolve keyed action</Button>
      <output data-testid="keyed-action-settled">{settled}</output>
      <output data-testid="keyed-action-success">{success}</output>
    </section>
  );
}
