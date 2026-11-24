import { useRef, useState } from 'react';
import { ui } from '../../src/ui';
import { Button } from '../../src/components/Button/Button';
import { Flex } from '../../src/components/Flex/Flex';
import { Input } from '../../src/components/Input/Input';
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
      <Flex as="form" ui={{ form }} dir={['column', 'column', 'column']} gap={[8, 8, 8]}>
        <Input name="title" aria-label="Edit title" errorPlacement="below" />
        <Textarea name="note" aria-label="Edit note" />
        <Flex ui={{ form: nested }} dir={['column', 'column', 'column']}>
          <Input name="title" aria-label="Nested title" />
        </Flex>
        <Button type="submit" ui={{ action: form.action }}>Save edit</Button>
      </Flex>
      <output data-testid="edit-calls">{calls}</output>
      <output data-testid="edit-dirty">{String(form.dirty)}</output>
      <Button onClick={() => finish.current?.()}>Confirm edit</Button>
      <Button onClick={form.reset}>Reset edit</Button>
      <Button onClick={form.clear}>Clear edit</Button>
    </section>
  );
}

export function FormFixture() {
  return (
    <ActionInvocationProvider onFailure={() => undefined}>
      <MessageForm />
      <EditForm />
    </ActionInvocationProvider>
  );
}
