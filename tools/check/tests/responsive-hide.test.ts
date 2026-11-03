import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { responsiveHideRule } from '../rules/responsive-hide.mjs';

function inspect(code: string) {
  return responsiveHideRule.check(ts.createSourceFile('Example.tsx', code, ts.ScriptTarget.Latest, true));
}

test('legacy JSX attributes and literal spread keys are rejected', () => {
  assert.equal(inspect('<Flex data-hide-mobile data-hide-tablet data-hide-pc data-hide-desktop />').length, 4);
  assert.equal(inspect("const props = { 'data-hide-mobile': true, ['data-hide-tablet']: true }; <Flex {...props} />;").length, 2);
});

test('hide, independent scrollbar mechanics, comments and labels remain valid', () => {
  assert.deepEqual(inspect(`
    // data-hide-mobile is removed.
    const label = 'data-hide-pc';
    <Flex hide={[true, false, false]} data-hide-scrollbar data-hide-other={false} />;
  `), []);
});
