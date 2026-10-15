import { useState } from 'react';

import { Button } from '../../src/components/Button';
import { LexicalText } from '../../src/components/RichText';
import { useScroll } from '../../src/hooks/useScroll';

export function RefactorContractsFixture() {
  const [limit, setLimit] = useState(0);
  const passed = useScroll((scroll) => scroll.y > limit);
  return (
    <section>
      <h2>Refactor contracts</h2>
      <button
        type="button"
        data-testid="scroll-selector-limit"
        style={{ position: 'fixed', top: 8, right: 8, zIndex: 1000 }}
        onClick={() => setLimit((current) => current === 0 ? 100000 : 0)}
      >Change selector limit</button>
      <output data-testid="scroll-selector-result">{String(passed)}</output>
      <Button
        data-testid="button-composed-motion"
        animate={{ when: 'load', effect: 'up', hover: { effect: 'rise' }, idle: { effect: 'glow', duration: 8 } }}
      >Composed button motion</Button>
      <LexicalText
        data-testid="lexical-unknown-nodes"
        content={{ root: { children: [
          null,
          { type: 'heading', tag: 'script', children: [{ type: 'text', text: 'Invalid tag' }] },
          { type: 'rich-heading', tag: 'h2', role: 'h2', children: [
            { type: 'text', text: 'Validated heading', format: 2, style: 'color: var(--secondary);' },
            { type: 'text', text: 42 },
          ] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Valid neighbor' }, { type: 'unsupported' }] },
        ] } }}
      />
    </section>
  );
}
