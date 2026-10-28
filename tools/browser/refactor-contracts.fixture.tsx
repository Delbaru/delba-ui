import { useState, type CSSProperties } from 'react';

import { Button } from '../../src/components/Button';
import { LexicalText } from '../../src/components/RichText';
import { useScroll } from '../../src/hooks/useScroll';
import { Flex } from '../../src/components/Flex';
import { GradientBorder } from '../../src/components/GradientBorder';
import { Carousel } from '../../src/components/Carousel';
import { Img } from '../../src/components/Img';

const imageSource = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22/%3E';

export function RefactorContractsFixture() {
  const [limit, setLimit] = useState(0);
  const [replacement, setReplacement] = useState(false);
  const passed = useScroll((scroll) => scroll.y > limit);
  return (
    <section>
      <h2>Refactor contracts</h2>
      <Flex>
        <Img
            data-testid="sizes-auto"
            src={imageSource}
            alt="Auto contain"
            objectFit={['contain', 'contain', 'contain']}
            w={[80, 80, 80]}
            h={[80, 80, 80]}
        />
        <Img
            data-testid="sizes-eager"
            src={imageSource}
            alt="Eager contain"
            loading="eager"
            objectFit={['contain', 'contain', 'contain']}
            w={[80, 80, 80]}
            h={[80, 80, 80]}
        />
        <Img
            data-testid="sizes-priority"
            src={imageSource}
            alt="Priority contain"
            priority
            objectFit={['contain', 'contain', 'contain']}
            w={[80, 80, 80]}
            h={[80, 80, 80]}
        />
        <Img
            data-testid="sizes-explicit"
            src={imageSource}
            alt="Explicit contain"
            sizes="72px"
            objectFit={['contain', 'contain', 'contain']}
            w={[80, 80, 80]}
            h={[80, 80, 80]}
        />
        <Img
            data-testid="sizes-zoom"
            src={imageSource}
            alt="Zoom contain"
            sizesWidth={['110%', '110%', '110%']}
            objectFit={['contain', 'contain', 'contain']}
            w={[80, 80, 80]}
            h={[80, 80, 80]}
        />
        <Img data-testid="sizes-cover" src={imageSource} alt="Cover" w={[80, 80, 80]} h={[80, 80, 80]} />
      </Flex>
      <button
        type="button"
        data-testid="scroll-selector-limit"
        style={{ position: 'fixed', top: 8, right: 8, zIndex: 1000 }}
        onClick={() => setLimit((current) => current === 0 ? 100000 : 0)}
      >Change selector limit</button>
      <output data-testid="scroll-selector-result">{String(passed)}</output>
      <Carousel data-testid="carousel-config-defaults" autoplay
        style={{ width: 240, '--t-m-carousel-duration': '0.12s', '--t-m-carousel-autoplay-delay': '0.17s' } as CSSProperties}>
        <div>First default slide</div><div>Second default slide</div><div>Third default slide</div>
      </Carousel>
      <button type="button" onClick={() => setReplacement((current) => !current)}>Replace tilt host</button>
      <Flex as={replacement ? 'section' : 'div'} data-testid="perspective-replacement" data-tilt-replacement
        style={{ width: 240, height: 100 }}
        perspective3d={{ perspective: 1600, scope: '[data-tilt-replacement]', scale: 1 }}>
        Replacement tilt host
      </Flex>
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
