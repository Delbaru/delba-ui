import { useEffect, useRef, useState } from 'react';
import { Button } from '../../src/components/Button';
import { Flex } from '../../src/components/Flex';
import { LexicalText } from '../../src/components/RichText';
import { LexicalTextarea, type LexicalTextareaChangePayload, type LexicalTextareaHandle, type LexicalTextareaVariable } from '../../src/components/RichTextarea';
import { ToastProvider, useToast, toast as notify } from '../../src/components/Toast';
import { useToastQueue } from '../../src/components/Toast/Toast.model';
import { ToastCard } from '../../src/components/Toast/ToastCard/ToastCard';

const VARIABLES: LexicalTextareaVariable[] = [{ key: 'client', label: 'Client name', aliases: ['customer'] }];
const STEPS = ['<p>Short step</p>', '<p>Long step<br>with another line<br>and a final line</p>'];

function EditorContracts() {
  const editor = useRef<LexicalTextareaHandle | null>(null);
  const [source, setSource] = useState('Initial document');
  const [changes, setChanges] = useState(0);
  const [snapshot, setSnapshot] = useState<LexicalTextareaChangePayload | null>(null);

  return (
    <section aria-label='Rich editor contracts'>
      <LexicalTextarea
          ref={editor}
          label='Rich document'
          content={source}
          variables={VARIABLES}
          required
          maxLength={100}
          minH={[180, 180, 180]}
          onChange={value => { setChanges(count => count + 1); setSnapshot(value); }}
      />
      <button type='button' onClick={() => setSource('Externally replaced document')}>Replace external document</button>
      <button type='button' onClick={() => editor.current?.insertVariable('client')}>Insert client variable</button>
      <button type='button' onClick={() => editor.current?.reset()}>Reset editor document</button>
      <button type='button' onClick={() => editor.current?.setContent('Imperative document')}>Set editor document</button>
      <output data-testid='editor-change-count'>{changes}</output>
      <output data-testid='editor-snapshot'>{JSON.stringify(snapshot)}</output>
    </section>
  );
}

function ToastContracts() {
  const toast = useToast();
  return <section aria-label='Toast contracts'>
    <Button onClick={() => {
      for (let index = 1; index <= 7; index += 1) {
        toast.show({ title: `Message ${index}`, durationMs: 60000 });
      }
    }}>Show seven messages</Button>
    <Button onClick={() => toast.show({ title: 'Short lived message', tone: 'warning', durationMs: 300 })}>Show short message</Button>
  </section>;
}

function AutomaticToast() {
  const notification = useToast();
  useEffect(() => { notification.show({ title: 'Effect-created message', durationMs: 300 }); }, [notification]);
  return null;
}

function ToastEvictionProbe() {
  const queue = useToastQueue();
  return <section>
    <button type='button' onClick={() => {
      for (let index = 0; index < 7; index += 1) queue.api.show({ title: `Probe ${index}`, durationMs: 60000 });
    }}>Batch eviction probe</button>
    <output data-testid='toast-owned-items'>{queue.items.length}</output>
    {queue.items.map(item => <ToastCard key={item.id} item={item} onDismiss={() => queue.close(item.id)} onExited={() => queue.remove(item.id)} />)}
  </section>;
}

function SequenceContracts() {
  const [step, setStep] = useState(0);
  return <section aria-label='Rich sequence contracts'>
    <button type='button' onClick={() => setStep(value => value === 0 ? 1 : 0)}>Change rich step</button>
    <LexicalText data-testid='rich-slide' animate={{ when: 'change', effect: 'textSlide', steps: STEPS, currentStep: step, duration: 'fast' }} />
    <LexicalText data-testid='rich-clip' animate={{ when: 'change', effect: 'textClip', steps: STEPS, currentStep: step, duration: 'fast' }} />
  </section>;
}

export function ContentFixture() {
  const [mounted, setMounted] = useState(true);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [automatic, setAutomatic] = useState(false);
  return <main>
    <h1>Delba UI content contracts</h1>
    <button type='button' onClick={() => setMounted(value => !value)}>Toggle content contracts</button>
    <button type='button' onClick={() => setAccepted(notify({ title: 'Direct command result', durationMs: 60000 }))}>Show direct message</button>
    <output data-testid='direct-toast-accepted'>{String(accepted)}</output>
    <button type='button' onClick={() => setAutomatic(value => !value)}>Toggle automatic notification</button>
    {automatic && <ToastProvider><AutomaticToast /></ToastProvider>}
    {mounted && <ToastProvider>
      <Flex dir={['column', 'column', 'column']} gap={[24, 24, 24]} maxW={[720, 720, 720]}>
        <EditorContracts />
        <ToastContracts />
        <ToastEvictionProbe />
        <SequenceContracts />
      </Flex>
    </ToastProvider>}
  </main>;
}
