import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import ts from 'typescript';

import { countViolations } from '../check-rules.mjs';
import { jsxFormatRule } from './rules/jsx-format.mjs';

const file = 'src/components/Example.tsx';
const fixtureOptions = { printWidth: 140, tabWidth: 4 };
const format = (text: string) => jsxFormatRule.fix(text, file, fixtureOptions);
const check = (text: string) => jsxFormatRule.count(text, file, fixtureOptions);

test('compact JSX with props and a short expression child stays on one line', () => {
  const input = `const text = (
    <Text
        variant="lead"
        color={d.hero_color}
        maxW="52rem"
    >
        {d.hero_eyebrow}
    </Text>
);
const flex = <Flex dir="row" align="center" gap="12">{items}</Flex>;
const threeProps = <Flex dir="row" align="center" gap="12" justify="between">{items}</Flex>;`;
  const expected = `const text = (
    <Text variant="lead" color={d.hero_color} maxW="52rem">{d.hero_eyebrow}</Text>
);
const flex = <Flex dir="row" align="center" gap="12">{items}</Flex>;
const threeProps = <Flex dir="row" align="center" gap="12" justify="between">{items}</Flex>;`;
  assert.equal(format(input), expected);
  assert.ok(check(input).length > 0);
  assert.deepEqual(check(expected), []);
  assert.equal(format(expected), expected);
});

test('long tags wrap attributes individually and put the terminator at tag indentation', () => {
  const input = `const view = <Section first="A deliberately long value that consumes a substantial portion of the available width" second="Another long value that pushes this tag beyond the configured print width" />;`;
  const expected = `const view = <Section
    first="A deliberately long value that consumes a substantial portion of the available width"
    second="Another long value that pushes this tag beyond the configured print width"
/>;`;
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test('nearest Prettier config and explicit options control width without changing multiline values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsx-format-config-'));
  try {
    const filepath = path.join(dir, 'Example.tsx');
    fs.writeFileSync(path.join(dir, '.prettierrc'), JSON.stringify({ printWidth: 60, tabWidth: 4 }));
    const input = `const value = <Item alpha="a value that makes the complete opening tag exceed sixty columns" beta="another value" />;`;
    const expected = `const value = <Item
    alpha="a value that makes the complete opening tag exceed sixty columns"
    beta="another value"
/>;`;
    assert.equal(jsxFormatRule.fix(input, filepath), expected);
    assert.equal(jsxFormatRule.fix('const value = <Item alpha="long enough" beta="also long" />;', file, { printWidth: 40, tabWidth: 4 }), 'const value = <Item\n    alpha="long enough"\n    beta="also long"\n/>;');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const multilineValue = `const view = <Hero data={{\n    title: 'A short title',\n    eyebrow: 'A short eyebrow',\n  }} compact="yes" />;`;
  assert.deepEqual(check(multilineValue), []);
  assert.equal(format(multilineValue), multilineValue);
});

test('nested JSX tag fixes do not overlap or lose nested attributes', () => {
  const input = `const view = <Card start={<Icon alpha="one long value to force this nested JSX tag beyond the configured print width" beta="another long value also forcing a line break" />} role="group" />;`;
  const expected = `const view = <Card
    start={<Icon
        alpha="one long value to force this nested JSX tag beyond the configured print width"
        beta="another long value also forcing a line break"
    />}
    role="group"
/>;`;
  assert.equal(format(input), expected);
  assert.deepEqual(check(expected), []);
  assert.equal(format(expected), expected);
});

test('well formatted source and comments, strings, and code snippets are ignored', () => {
  const input = `// <Card id="comment" className="example">
const example = "<Card id=\\"one\\" className=\\"two\\">";
const view = <Card id="https://example.test/a" className="two"><Text>keep this text</Text></Card>;
const commented = <Card id="one" /* keep comment */ className="two" />;`;
  assert.deepEqual(check(input), []);
  assert.equal(format(input), input);
});

test('complex children and whitespace-significant text stay untouched', () => {
  const input = `<Text> leading and trailing </Text>
<Text> {label} </Text>
<Text>
  before {label} after
</Text>
<Text>
  <span>{label}</span>
</Text>`;
  assert.deepEqual(check(input), []);
  assert.equal(format(input), input);
});

test('safe fixes preserve CRLF and JSX text whitespace', () => {
  const input = '<Item a="1" b="2" />\r\n<Text>\r\n  {label}\r\n</Text>\r\n<Text> leading </Text>\r\n';
  const expected = '<Item a="1" b="2" />\r\n<Text>{label}</Text>\r\n<Text> leading </Text>\r\n';
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test('typecheck fixtures keep JSX diagnostics on the line covered by ts-expect-error', () => {
  const fixture = '// @ts-expect-error Invalid option.\nconst invalid = <Select options={options} value={countries} />;';
  assert.deepEqual(jsxFormatRule.count(fixture, 'Select.typecheck.tsx'), []);
  assert.equal(jsxFormatRule.fix(fixture, 'Select.typecheck.tsx'), fixture);
});

test('Prettier 3 keeps short JSX inline, wraps long tags in four spaces, and is idempotent', async () => {
  const input = `const text = <Text variant="lead" color="white" maxW="52rem">{d.hero_eyebrow}</Text>;
const styled = <Text tone={ { color : "white" } }>{data.title}</Text>;
const flex = <Flex dir="row" align="center" gap="12">{items}</Flex>;
const nested = <Card start={<Icon a="one" b="two" />} role="group" />;
const typed = <Component<Item> value={value}>{label}</Component>;
const hero = <Hero data={{
    title: 'A short title',
    eyebrow: 'A short eyebrow',
  }}><Text variant="lead" color="white" maxW="52rem">{d.hero_eyebrow}</Text></Hero>;
  const long = <Section first="A deliberately long value that consumes a substantial portion of the available width making the total tag quite a bit longer than the configured width" second="Another long value that pushes this tag beyond the configured print width" />;`;
  const filepath = path.resolve(file);
  const options = {
    filepath,
    parser: 'typescript',
    printWidth: 140,
    tabWidth: 4,
    singleQuote: true,
    plugins: [fileURLToPath(new URL('./prettier-plugin.mjs', import.meta.url))],
  };
  const formatted = await prettier.format(input, options);
  assert.match(formatted, /const text = <Text variant="lead" color="white" maxW="52rem">\{d\.hero_eyebrow\}<\/Text>;/);
  assert.match(formatted, /const styled = <Text tone=\{\{ color: 'white' \}\}>\{data\.title\}<\/Text>;/);
  assert.match(formatted, /const flex = <Flex dir="row" align="center" gap="12">\{items\}<\/Flex>;/);
  assert.match(formatted, /const nested = <Card start=\{<Icon a="one" b="two" \/>\} role="group" \/>;/);
  assert.match(formatted, /const typed = <Component<Item> value=\{value\}>\{label\}<\/Component>;/);
  assert.match(formatted, /<Text variant="lead" color="white" maxW="52rem">\{d\.hero_eyebrow\}<\/Text>/);
  assert.match(formatted, /eyebrow: 'A short eyebrow'/);
  assert.match(formatted, /\n    <Section\n        first=/);
  assert.match(formatted, /\n    \/>\n/);
  assert.deepEqual(check(formatted), []);
  assert.deepEqual(ts.createSourceFile('formatted.tsx', formatted, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics, []);
  assert.equal(await prettier.format(formatted, options), formatted);
});

test('Prettier keeps deeply nested conditional JSX stable across passes', async () => {
  const source = `const view = (
    <Flex>
        <Grid>
            {contact && (
                <GridItem>
                    <Flex>
                        <Flex>
                            {contact.footerVisit && (
                                <Text variant={['p4', 'p4', 'p4']} color="var(--text-muted)">
                                    {contact.footerVisit}
                                </Text>
                            )}
                        </Flex>
                    </Flex>
                </GridItem>
            )}
        </Grid>
    </Flex>
);`;
  const options = {
    filepath: path.resolve(file),
    parser: 'typescript',
    printWidth: 140,
    tabWidth: 4,
    singleQuote: true,
    plugins: [fileURLToPath(new URL('./prettier-plugin.mjs', import.meta.url))],
  };
  const first = await prettier.format(source, options);
  const second = await prettier.format(first, options);
  assert.equal(second, first);
  assert.deepEqual(check(first), []);
});

test('existing project rules registry reports JSX formatting through its file baseline', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsx-format-'));
  try {
    fs.writeFileSync(path.join(dir, 'Example.tsx'), '<Card\n  a="1"\n  b="2"\n/>\n');
    const { counts, places } = countViolations([dir]);
    assert.equal(counts['jsx-format']?.[path.relative(process.cwd(), path.join(dir, 'Example.tsx')).split(path.sep).join('/')], 1);
    assert.deepEqual(Object.values(places['jsx-format'] ?? {}).flat(), [1]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
