import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkTestPlacement } from '../../../../tools/check/test-placement.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
test('all library test files live in root tests/', () => {
  assert.deepEqual(checkTestPlacement(root), []);
});

test('placement detects every test kind but preserves fixtures, config and runtime modules', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-test-placement-'));
  const put = (file: string) => {
    const target = path.join(temporary, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
  };
  try {
    for (const file of [
      'src/Field/tests/value.test.ts',
      'src/Field/value.test.ts',
      'src/Field/props.type-test.ts',
      'src/Field/props.typecheck.tsx',
      'tools/check/tests/example.spec.ts',
    ]) put(file);
    for (const file of [
      'tests/Field/unit/value.test.ts',
      'tests/Tools/unit/example.spec.ts',
      'tests/Tools/unit/props.type-test.ts',
      'tools/example.fixture.tsx',
      'tools/check/config.ts',
      'src/Field/Field.model.ts',
    ]) put(file);
    assert.deepEqual(checkTestPlacement(temporary), [
      'src/Field/props.type-test.ts',
      'src/Field/props.typecheck.tsx',
      'src/Field/tests/value.test.ts',
      'src/Field/value.test.ts',
      'tools/check/tests/example.spec.ts',
    ]);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
