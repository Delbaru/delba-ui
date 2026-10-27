import assert from 'node:assert/strict';
import test from 'node:test';

import { motionTokenDuplicates, readContract } from './check-tokens.mjs';

test('motion timing definitions belong to config; references and comments remain valid', () => {
  const generated = ':root { --t-d-fast: 0.24s; --t-d-slow: 0.7s; }';
  assert.deepEqual(motionTokenDuplicates(':root { --t-d-fast: 0.1s; --t-d-fast: 0.2s; }', generated), ['--t-d-fast']);
  assert.deepEqual(motionTokenDuplicates('/* --t-d-slow: 1s */ :root { --t-fast: all var(--t-d-fast); --brand: red; }', generated), []);
  assert.deepEqual(motionTokenDuplicates(':root { --t-d-fast: 0.1s; }', '// no config'), []);
});

test('generated motion scale and easing roles are kit-owned, while colors remain a theme contract', () => {
  const contract = readContract();
  assert.equal(contract.tokens.has('--t-d-slow'), false);
  assert.equal(contract.tokens.has('--t-t-f-back'), false);
  assert.ok(contract.tokens.has('--primary'));
});
