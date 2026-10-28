import { useState } from 'react';
import { Text } from '../../src/components/Text/Text';
import { Flex } from '../../src/components/Flex/Flex';

export { armReveal, releaseReveal } from '../../src/core/reveal/observer';
export { resolveReveal } from '../../src/core/reveal/reveal';

export function TextTimelineFixture() {
  const [version, setVersion] = useState(0);
  const [labelIndex, setLabelIndex] = useState(0);
  const labels = ['Подвески', 'Подвески новые', 'Все украшения', 'Серьги'];
  return <section data-testid="text-timelines">
    <button data-testid="slide-label-update" onClick={() => setLabelIndex(index => (index + 1) % labels.length)}>Change label</button>
    <Text data-testid="slide-label" as="h2" fontSize={[72, 72, 72]} lineHeight={[1, 1, 1]} animate={{ when: 'change', effect: 'textSlide', by: 'text', duration: 0.35 }}>
      {labels[labelIndex]}
    </Text>
    <Text as="p" data-testid="slide-inline">Найдено{' '}
      <Text as="span" variant={['inherit', 'inherit', 'inherit']} animate={{ when: 'change', effect: 'textSlide', by: 'text' }}>изделий</Text>
    </Text>
    <button onClick={() => setVersion(version + 1)} data-testid="timeline-rerender">Rerender {version}</button>
    {[0, 0.5, 1].map(progress => <Text key={progress} data-testid={`timeline-${progress}`} animate={{
      when: 'inView', delay: 0.2, effect: {
        up: { duration: 0.6, distance: 24 },
        counter: { to: 100, duration: 0.4, startAt: { effect: 'up', progress } },
      },
    }}>100</Text>)}
    <Text data-testid="timeline-repeat" animate={{ when: 'inView', once: false, effect: { up: { duration: 0.3 }, counter: { to: 100, duration: 0.3 } } }}>100</Text>
    <Text data-testid="timeline-zero" animate={{ when: 'load', effect: { up: { duration: 0 }, counter: { to: 10, duration: 0, startAt: { effect: 'up', progress: 1 } } } }}>10</Text>
    <Flex data-testid="timeline-parent" animate={{ when: 'inView', effect: 'up', duration: 0.4, delay: 0.8, stagger: 0.3 }}>
      {[0, 1].map(index => <div key={index} data-testid={`timeline-card-${index}`}>
        <Text data-testid={`timeline-child-${index}`} animate={{ when: 'inView', effect: {
          up: { duration: 0.4 }, counter: { to: 100, duration: 0.2, startAt: { effect: 'up', progress: 0.5 } },
        } }}>100</Text>
      </div>)}
    </Flex>
    <Flex data-testid="reveal-batches" gap={[8, 8, 8]}>
      <Flex animate={{ when: 'inView', effect: 'up', duration: 0.2, stagger: 0.06 }}>
        <div data-testid="reveal-batch-a0">A0</div>
        <div data-testid="reveal-batch-a1"><span data-testid="batch-descendant">A1</span></div>
      </Flex>
      <Flex animate={{ when: 'inView', effect: 'up', duration: 0.4, delay: 0.1, stagger: 0.08 }}>
        <div data-testid="reveal-batch-b0">B0</div>
        <div data-testid="reveal-batch-b1">B1</div>
      </Flex>
    </Flex>
    <Flex animate={{ when: 'load', effect: 'up', duration: 0.2, delay: 0.1, stagger: 0.08 }}>
      <div data-testid="reveal-load-child-0">Load 0</div>
      <div data-testid="reveal-load-child-1">Load 1</div>
    </Flex>
  </section>;
}
