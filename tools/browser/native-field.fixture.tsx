import { useRef, useState } from 'react';
import { Input } from '../../src/components/Input/Input';
import { Textarea } from '../../src/components/Textarea/Textarea';

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
  </section>;
}
