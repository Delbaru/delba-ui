import { useState } from 'react';
import { Text } from '../../src/components/Text/Text';
import { Flex } from '../../src/components/Flex/Flex';

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
  </section>;
}
