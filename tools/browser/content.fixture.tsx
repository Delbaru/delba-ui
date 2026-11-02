import { useRef, useState } from 'react';
import { Button } from '../../src/components/Button';
import { Flex } from '../../src/components/Flex';
import { LexicalText } from '../../src/components/RichText';
import { LexicalTextarea, type LexicalTextareaChangePayload, type LexicalTextareaHandle, type LexicalTextareaVariable } from '../../src/components/RichTextarea';
import { ToastProvider, useToast } from '../../src/components/Toast';

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
  return <main>
    <h1>Delba UI content contracts</h1>
    <button type='button' onClick={() => setMounted(value => !value)}>Toggle content contracts</button>
    {mounted && <ToastProvider>
      <Flex dir={['column', 'column', 'column']} gap={[24, 24, 24]} maxW={[720, 720, 720]}>
        <EditorContracts />
        <ToastContracts />
        <SequenceContracts />
      </Flex>
    </ToastProvider>}
  </main>;
}
