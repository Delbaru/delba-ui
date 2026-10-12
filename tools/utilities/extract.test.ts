import assert from 'node:assert/strict';
import test from 'node:test';

import { extractUtilityRules, type Source } from './extract';

const classesOf = (sources: Source[], options: Parameters<typeof extractUtilityRules>[1] = {}) =>
  new Set(extractUtilityRules(sources, options).map((rule) => rule.className));

test('литерал в пропе — ровно те классы, что выдаст рантайм', () => {
  const classes = classesOf([{ file: 'a.tsx', text: 'export const A = () => <Flex p={[8, 0, 0]} gap={[16]} />;' }]);
  assert.ok(classes.has('p_8') && classes.has('n_p_0') && classes.has('gap_16'));
  assert.ok(!classes.has('d_p_8'), 'схлопнутый кортеж не печатает брейкпоинт');
});

test('коробка генерирует responsive фон/координаты и закрытый CSS-словарь динамического hide', () => {
  const classes = classesOf([
    { file: 'presets.ts', text: `export const presets = { toast: { position: ['fixed', 'fixed', 'fixed'], top: [20, null, 24], bg: ['var(--paper)', 'var(--background)', 'var(--paper)'], hide: [false, true, false] } };` },
    { file: 'page.tsx', text: `export function Card({ hidden }) { return <Box hide={[hidden, false, true]} position={['relative','relative','relative']} left={[16,'auto',null]} />; }` },
  ]);
  for (const name of ['hide_true', 'd_hide_true', 'n_hide_true', 'm_hide_true', 't_hide_true', 'position_fixed', 'position_relative', 'top_20', 'top_24', 'bg_--paper', 'bg_--background', 'd_left_16', 'm_left_auto']) {
    assert.ok(classes.has(name), name);
  }
});

test('константа, её поле и арифметика вычисляются', () => {
  const classes = classesOf([
    {
      file: 'a.tsx',
      text: `
        const PANEL = 670;
        const COLUMNS = { group: 300 } as const;
        export const A = () => <><Flex w={[PANEL / 2, null, null]} /><Flex w={[COLUMNS.group, null, null]} /></>;
      `,
    },
  ]);
  assert.ok(classes.has('d_w_335') && classes.has('d_w_300'));
});

test('импорт константы из соседнего файла', () => {
  const sources = [
    { file: '/p/sizes.ts', text: 'export const RAIL = 72;' },
    { file: '/p/a.tsx', text: "import { RAIL } from './sizes'; export const A = () => <Flex h={RAIL} />;" },
  ];
  const classes = classesOf(sources, { resolveModule: (_from, spec) => (spec === './sizes' ? '/p/sizes.ts' : undefined) });
  assert.ok(classes.has('h_72'));
});

test('проброс пропа компонентом: size у Checkbox рождает w и h его Flex', () => {
  const classes = classesOf([
    { file: 'checkbox.tsx', text: 'export function Checkbox({ size }) { return <Flex w={size ?? 24} h={size ?? 24} />; }' },
    { file: 'page.tsx', text: 'export const Page = () => <Checkbox size={[20, null, null]} />;' },
  ]);
  assert.ok(classes.has('d_w_20') && classes.has('d_h_20'), 'значение с вызова');
  assert.ok(classes.has('w_24') && classes.has('h_24'), 'дефолт внутри компонента');
});

test('общая коробка поля сохраняет padding и классы helper после отделения пропсов', () => {
  const classes = classesOf([
    { file: 'field.tsx', text: `
      import { splitBoxLayout as split, resolveFieldLayout as resolve, fieldLayoutClasses } from './core';
      export function Field(props) {
        const { box, rest: fieldProps } = split(props);
        const { value: text } = fieldProps;
        const layoutProps = resolve({ ...box });
        const classes = fieldLayoutClasses(c, layoutProps);
        return <><input className={classes} value={text} /><Text pl={helper(layoutProps.p, layoutProps.pl)} /></>;
      }
    ` },
    { file: 'a.tsx', text: '<Field p={[0, 12, 0, 12]} pl={[20, 8, 20]} />;' },
  ]);
  assert.ok(classes.has('p_0_12_0_12'), 'padding поля не вытесняется пробросом в helper');
  for (const name of ['pl_12', 'd_pl_20', 'm_pl_8', 't_pl_20']) assert.ok(classes.has(name), name);
});

test('параметр props поддерживает проброс поля, произвольный адаптер остаётся непрозрачным', () => {
  const classes = classesOf([
    { file: 'a.tsx', text: `
      export function Direct(props) { return <Flex w={props.measure} />; }
      export function Unknown(props) {
        const layout = transform(props);
        return <Flex w={layout.measure} />;
      }
      const A = () => <><Direct measure={44} /><Unknown measure={52} /></>;
    ` },
  ]);
  assert.ok(classes.has('w_44'));
  assert.ok(!classes.has('w_52'));
});

test('ключ данных: значение из объекта доходит до утилиты через поле', () => {
  const classes = classesOf([
    { file: 'data.ts', text: "export const STATS = [{ value: '∞', valueFontSize: [80, 44, 44] }];" },
    { file: 'stats.tsx', text: 'export const Stats = ({ items }) => items.map((item) => <Text fontSize={item.valueFontSize} />);' },
  ]);
  assert.ok(classes.has('fontSize_80') && classes.has('n_fontSize_44'));
});

test('ключ с большим набором значений — данные, а не токен: не берётся', () => {
  const items = Array.from({ length: 20 }, (_, i) => `{ width: ${100 + i} }`).join(', ');
  const classes = classesOf([
    { file: 'data.ts', text: `export const IMAGES = [${items}];` },
    { file: 'img.tsx', text: 'export const Pic = ({ image }) => <Flex w={image.width} />;' },
  ]);
  assert.ok(!classes.has('w_105'));
});

test('шаблонная строка с условием вычисляется в обе стороны', () => {
  const classes = classesOf([
    { file: 'a.tsx', text: "export const A = ({ on }) => <Flex border={[`calc(1.5 * var(--rpx)) solid ${on ? 'var(--primary)' : 'var(--line)'}`, null, null]} />;" },
  ]);
  assert.equal([...classes].filter((name) => name.startsWith('d_border_')).length, 2);
});

test('поле конфига — база и все брейкпоинты', () => {
  const classes = classesOf([{ file: 'config.ts', text: 'export const PRESET = { gap: 12, p: [16, 32] };' }]);
  for (const name of ['gap_12', 'd_gap_12', 'n_gap_12', 'm_gap_12', 't_gap_12', 'p_16_32_16_32', 'n_p_16_32_16_32']) assert.ok(classes.has(name), name);
});

test('затравка и закрытые словари печатаются без поиска', () => {
  const classes = classesOf([], { seeds: { r: [24] } });
  assert.ok(classes.has('r_24') && classes.has('m_r_24'));
  assert.ok(classes.has('dir_column') && classes.has('n_text_h2') && classes.has('grow_1'));
});
