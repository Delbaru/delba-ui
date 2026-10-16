import { useState } from 'react';

import { Button } from '../../src/components/Button';
import { LexicalText } from '../../src/components/RichText';
import { useScroll } from '../../src/hooks/useScroll';
import { Flex } from '../../src/components/Flex';
import { GradientBorder } from '../../src/components/GradientBorder';

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
      <Flex data-testid="perspective-scope" data-tilt-scope position={['relative', 'relative', 'relative']} w={[400, 400, 400]} h={[200, 200, 200]}>
        <Flex
          data-testid="perspective-scoped-photo"
          w={[120, 120, 120]}
          h={[120, 120, 120]}
          perspective3d={{ perspective: 1600, scope: '[data-tilt-scope]', maxRotateX: 6, maxRotateY: 10, scale: 1 }}
        />
        <Button data-testid="perspective-scope-link" w={['100%', '100%', '100%']} h={['100%', '100%', '100%']} style={{ position: 'absolute', inset: 0 }}>Scoped stretched link</Button>
        <GradientBorder
          gradient={['conic-gradient(from var(--ui-border-angle), transparent, red)', 'conic-gradient(from var(--ui-border-angle), transparent, red)', 'conic-gradient(from var(--ui-border-angle), transparent, red)']}
          animate={{ when: 'idle', effect: 'trace', duration: 2 }}
        />
      </Flex>
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
