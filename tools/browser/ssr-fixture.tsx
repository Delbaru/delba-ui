import { useState, type SVGProps } from 'react';

import { Box } from '../../src/components/Box/Box';
import { Button } from '../../src/components/Button/Button';
import { Flex } from '../../src/components/Flex/Flex';
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
  const [phone, setPhone] = useState('+14155552671');

  return (
    <main className="fixture">
      <h1>SSR and hydration</h1>
      <Button
        data-testid="ssr-button"
        tooltip="Открыть"
        onClick={() => setOpen((current) => !current)}
      >Открыть</Button>
      <Box animate="fadeInUp" data-testid="ssr-box" reveal="up">
        <Text>Содержимое</Text>
      </Box>
      <Flex collapse={{ open, keepMounted: true }} data-testid="ssr-collapse">
        <Input aria-label="Closed field" defaultValue="ФИО" />
      </Flex>
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
