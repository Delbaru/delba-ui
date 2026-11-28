import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUtility } from '../../../../src/core/utilities/registry';
import { TEXT_ROLES } from '../../../../src/core/base/typography';

test('configured typography uses six independent longhands and the generated viewport bands', () => {
    assert.deepEqual(Object.keys(TEXT_ROLES), ['body', 'caption', 'micro']);
    const declaration = resolveUtility('text')?.declare('body');
    assert.ok(declaration);
    assert.match(declaration, /@media/);
    assert.match(declaration, /font-size: var\(--type-body-font-size\)/);
    assert.match(declaration, /font-weight: var\(--type-body-font-weight\)/);
    assert.doesNotMatch(declaration, /font:|revert-layer|--font-p/);
});
