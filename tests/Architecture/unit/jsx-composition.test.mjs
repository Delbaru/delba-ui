import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { jsxCompositionRule } from '../../../tools/check/rules/jsx-composition.mjs';

const inspect = code => jsxCompositionRule.check(ts.createSourceFile('Fixture.tsx', code, ts.ScriptTarget.Latest, true));

test('complex local JSX declarations and assignments are review warnings', () => {
  const found = inspect(`function Panel() {
    const heading = (<Box><Row><Text /></Row></Box>);
    let body;
    body = ready ? <><A /><B /><C /><D /></> : null;
    return <>{heading}{body}</>;
  }`);
  assert.equal(found.length, 2);
  assert.deepEqual(found.map(item => item.severity), ['warning', 'warning']);
  assert.deepEqual(found.map(item => item.line), [2, 4]);
  assert.equal(jsxCompositionRule.fix, undefined);
});

test('short slots, direct returns, callbacks and configuration are legitimate composition', () => {
  assert.deepEqual(inspect(`
    const moduleSlot = <Box><Row><Text /></Row></Box>;
    function Panel() {
      const label = <Text />;
      const slot = ok ? <Spinner /> : null;
      const columns = [{ cell: <Box><Row><Text /></Row></Box> }];
      const rows = items.map(item => <Box><Row><Text /></Row></Box>);
      return <Layout renderItem={item => <Box><Row><Text /></Row></Box>}>
        {label}{slot}{rows}<Box><Row><Text /></Row></Box>
      </Layout>;
    }`), []);
});

test('does not mistake JSX in an attribute slot for the outer layout', () => {
  assert.deepEqual(inspect(`function Panel() {
    const icon = <Control menu={<Box><Row><Text /></Row></Box>} />;
    return icon;
  }`), []);
});

test('a heading with conditional label is a review candidate, not a mechanical ban', () => {
  const found = inspect(`function Calendar() {
    const heading = <Box><Text>{date}</Text>{info && <Text>{info.label}</Text>}</Box>;
    return <Day>{heading}</Day>;
  }`);
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 'warning');
});
