import { useRef, useState, type SVGProps } from 'react';
import type { CollapseControls } from '../../src/hooks/useCollapseControls';

import { Box } from '../../src/components/Box/Box';
import { Button } from '../../src/components/Button/Button';
import { Flex } from '../../src/components/Flex/Flex';
import { GradientBorder } from '../../src/components/GradientBorder';
import { Icon } from '../../src/components/Icon/Icon';
import { Input } from '../../src/components/Input/Input';
import { PhoneField } from '../../src/components/PhoneField/PhoneField';
import { LexicalText } from '../../src/components/RichText/RichText';
import { Text } from '../../src/components/Text/Text';
import { Textarea } from '../../src/components/Textarea/Textarea';

function Glyph(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 16 16" {...props}><path d="M2 8h12M8 2v12" /></svg>;
}

export function SsrFixture() {
  const [open, setOpen] = useState(false);
  const panel = useRef<CollapseControls>(null);
  const [phone, setPhone] = useState('+14155552671');

  return (
    <main className="fixture">
      <h1>SSR and hydration</h1>
      <Flex position={['relative', 'relative', 'relative']} r={[24, 16, 20]}>
        <GradientBorder gradient={['var(--primary)', 'var(--primary)', 'var(--primary)']} />
        <Text>Framed server content</Text>
      </Flex>
      <Text animate={{ effect: 'up', when: 'load', fade: false, duration: 'slow', delay: 'veryFast' }}>Первый кадр</Text>
      <Text data-testid="ssr-counter" animate={{ when: 'load', effect: 'counter', duration: 'slow' }}>125%</Text>
      <Text data-testid="ssr-timeline" animate={{ when: 'inView', effect: {
        up: { duration: 'slow' }, counter: { duration: 'normal', startAt: { effect: 'up', progress: 1 } },
      } }}>250%</Text>
      <Flex as="dl" data-testid="ssr-requisites" dir={['column', 'column', 'column']} gap={[8, 8, 8]} m={[0, 0, 0]}>
        <Flex><Text as="dt">ИНН</Text><Text as="dd">1234567890</Text></Flex>
      </Flex>
      <Button
        data-testid="ssr-button"
        tooltip="Открыть"
        onClick={() => {
          setOpen((current) => !current);
          void panel.current?.show();
        }}
      >Открыть</Button>
      <Box animate={{ effect: 'up', when: 'inView', delay: 0.02 }} parallax={{ mode: 'scroll', distance: 20 }} data-testid="ssr-box">
        <Text>Содержимое</Text>
      </Box>
      <Flex collapse={{ open, keepMounted: true }} data-testid="ssr-collapse">
        <Input aria-label="Closed field" defaultValue="ФИО" />
      </Flex>
      <Input
        aria-label="Uncontrolled server field"
        defaultValue="Server state"
        collapse={{ defaultOpen: false, ref: panel, keepMounted: true }}
      />
      <Text role="alert" collapse={{ open, fade: true }}>Подсказка</Text>
      <LexicalText content="<p>Текст из CMS</p>" reveal="up" />
      <Icon component={Glyph} tooltip="Иконка" aria-label="Icon" w={[16, 16, 16]} h={[16, 16, 16]} />
      <Input data-testid="ssr-input" name="name" defaultValue="Иван" label="Имя" />
      <Textarea data-testid="ssr-textarea" defaultValue="Сообщение" label="Сообщение" />
      <PhoneField
        country={{ countries: ['RU', 'US'], default: 'RU' }}
        value={phone}
        onValueChange={setPhone}
        aria-label="Phone"
      />
    </main>
  );
}
