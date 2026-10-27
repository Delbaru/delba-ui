import { useRef, useState, type CSSProperties } from 'react';
import { Input } from '../../src/components/Input/Input';
import { Textarea } from '../../src/components/Textarea/Textarea';
import { Checkbox } from '../../src/components/Checkbox/Checkbox';
import { Select } from '../../src/components/Select/Select';
import { ChoiceButtons } from '../../src/components/ChoiceButtons/ChoiceButtons';
import { Section } from '../../src/components/Section/Section';
import { Text } from '../../src/components/Text/Text';

function LifecycleContracts() {
  const [cancelReset, setCancelReset] = useState(false);
  const [changes, setChanges] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateDisabled, setDateDisabled] = useState(false);
  const [pointerEvents, setPointerEvents] = useState(0);
  const [motionVersion, setMotionVersion] = useState(0);
  const overflowHost = useRef<HTMLDivElement>(null);
  const options = [{ value: 'one', label: 'Lifecycle first' }, { value: 'two', label: 'Lifecycle alternate' }];
  return <section aria-label="Audit lifecycle contracts">
    <form id="audit-reset-form" onReset={(event) => { if (cancelReset) event.preventDefault(); }}>
      <Checkbox name="unchecked" aria-label="Uncontrolled visual checkbox" />
      <Checkbox name="checked" defaultChecked aria-label="Initially checked visual checkbox" />
      <Select name="single" aria-label="Reset single select" options={options} defaultValue="one" onChange={() => setChanges((n) => n + 1)} />
      <Select name="multiple" aria-label="Reset multiple select" options={options} multiple defaultValue={['one']} onChange={() => setChanges((n) => n + 1)} />
      <button type="reset">Reset lifecycle form</button>
    </form>
    <ChoiceButtons form="audit-reset-form" name="choice" defaultValue="one" items={options} onChange={() => setChanges((n) => n + 1)} />
    <button type="button" onClick={() => setCancelReset((value) => !value)}>Toggle lifecycle reset cancellation</button>
    <output data-testid="audit-change-count">{changes}</output>
    <Input type="date" readOnly defaultValue="2025-01-15" aria-label="Read only calendar" onValueChange={() => setChanges((n) => n + 1)} />
    <Input type="date" disabled={dateDisabled} defaultValue="2025-01-15" aria-label="Disable open calendar" />
    <button type="button" onClick={() => setDateDisabled((value) => !value)}>Toggle lifecycle date disabled</button>
    <div ref={overflowHost} style={{ width: 600 }}>
      <Input loading={loading} defaultValue="Overflow measurement follows the replacement input" aria-label="Replacement overflow field" w={['100%', '100%', '100%']} />
    </div>
    <button type="button" onClick={() => setLoading((value) => !value)}>Toggle replacement loading</button>
    <button type="button" onClick={() => { if (overflowHost.current) overflowHost.current.style.width = '100px'; }}>Shrink overflow host</button>
    <Section perspective3d={1000} style={{ width: 200, height: 80 }} data-testid="audit-event-section"
      onMouseEnter={() => setPointerEvents((n) => n + 1)} onMouseMove={() => setPointerEvents((n) => n + 1)}>
      Composed pointer section
    </Section>
    <Checkbox perspective3d={1000} aria-label="Composed pointer checkbox" onMouseEnter={() => setPointerEvents((n) => n + 1)}>Pointer checkbox</Checkbox>
    <output data-testid="audit-pointer-count">{pointerEvents}</output>
    <button type="button" onClick={() => setMotionVersion((n) => n + 1)}>Update seconds contracts</button>
    <Text data-testid="audit-counter-seconds" animation={['counter', { to: 80 + motionVersion * 80, duration: 0.6, trigger: 'onLoad' }]}>0</Text>
    <Text data-testid="audit-slide-clock" style={{ '--t-m-text-slide-duration': '0.22s' } as CSSProperties} animate={{ when: 'change', effect: 'textSlide' }}>{motionVersion ? 'NEW' : 'OLD'}</Text>
    <Section data-testid="audit-margin-object" style={{ height: 80, width: 200 }} animate={{ when: 'inView', effect: 'up', duration: 0.1, once: false, rootMargin: { top: '0px', right: '0px', bottom: '-10%', left: '0px' } }}>Explicit viewport margins</Section>
  </section>;
}

export function NativeFieldFixture() {
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [body, setBody] = useState('');
  const [submits, setSubmits] = useState(0);
  const [refs, setRefs] = useState('');
  return <section className="fixture" aria-label="Native field decoration contracts">
    <form onSubmit={(event) => { event.preventDefault(); setSubmits((value) => value + 1); }}>
      <Input ref={input} aria-label="Decorated native input" required nativeValidation value={text}
        onChange={(event) => setText(event.target.value)}
        field={{ className: 'native-input-contract', style: { paddingLeft: 13 } }} />
      <Textarea ref={textarea} aria-label="Decorated native textarea" required value={body}
        onChange={(event) => setBody(event.target.value)} showCount={false}
        field={{ className: 'native-textarea-contract', style: { paddingLeft: 17 } }} />
      <button type="button" onClick={() => {
        setRefs(`${input.current?.tagName}:${textarea.current?.tagName}`);
        textarea.current?.focus();
      }}>Verify decorated native refs</button>
      <button type="submit">Submit decorated native fields</button>
      <output data-testid="native-field-submits">{submits}</output>
      <output data-testid="native-field-refs">{refs}</output>
    </form>
    <Input aria-label="Default custom required input" required />
    <LifecycleContracts />
  </section>;
}
