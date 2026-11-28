import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { jsxCompositionRule } from '@delba/eslint';

const inspect = code => jsxCompositionRule.check(ts.createSourceFile('Fixture.tsx', code, ts.ScriptTarget.Latest, true));

test('complex local JSX declarations and assignments are review warnings', () => {
  const found = inspect(`function Panel() {
    const heading = (<Flex><Row><Text /></Row></Flex>);
    let body;
    body = ready ? <><A /><B /><C /><D /></> : null;
    return <>{heading}{body}</>;
  }`);
  assert.equal(found.length, 2);
  assert.deepEqual(found.map(item => item.severity), ['warning', 'warning']);
  assert.deepEqual(found.map(item => item.line), [2, 4]);
  assert.equal(jsxCompositionRule.fix, undefined);
});

test('short slots, render props, direct returns, callbacks and configuration remain legitimate', () => {
  assert.deepEqual(inspect(`
    const moduleSlot = <Flex><Row><Text /></Row></Flex>;
    function Panel() {
      const label = <Text />;
      const slot = ok ? <Spinner /> : null;
      const columns = [{ cell: <Flex><Row><Text /></Row></Flex> }];
      const rows = items.map(item => <Flex><Row><Text /></Row></Flex>);
      return <Layout renderItem={item => <Flex><Row><Text /></Row></Flex>}>
        {label}{slot}{rows}<Flex><Row><Text /></Row></Flex>
      </Layout>;
    }`), []);
});

test('does not mistake JSX in an attribute slot for the outer layout', () => {
  assert.deepEqual(inspect(`function Panel() {
    const icon = <Control menu={<Flex><Row><Text /></Row></Flex>} />;
    return icon;
  }`), []);
});

test('a heading with conditional label is a review candidate, not a mechanical ban', () => {
  const found = inspect(`function Calendar() {
    const heading = <Flex><Text>{date}</Text>{info && <Text>{info.label}</Text>}</Flex>;
    return <Day>{heading}</Day>;
  }`);
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 'warning');
});

test('mapped layouts exceeding the short composition threshold remain review warnings', () => {
  const found = inspect(`function Panel() {
    const rows = items.map(item => <Flex><Row><Text><Icon /></Text></Row></Flex>);
    const cells = items.flatMap(item => { return <Flex><A /><B /><C /><D /></Flex>; });
    return <>{rows}{cells}</>;
  }`);
  assert.deepEqual(found.map(item => item.severity), ['warning', 'warning']);
});
