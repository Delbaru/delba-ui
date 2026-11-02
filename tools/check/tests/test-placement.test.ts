import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkTestPlacement } from '../test-placement.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
test('all UI unit, static type and browser tests live in tests/ folders', () => {
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
    for (const file of ['src/Field/value.test.ts', 'src/Field/props.type-test.ts', 'src/Field/props.typecheck.tsx', 'tools/browser/example.spec.ts']) put(file);
    for (const file of ['src/Field/tests/value.test.ts', 'tools/browser/tests/example.spec.ts', 'tools/browser/example.fixture.tsx', 'tools/browser/playwright.config.ts', 'src/Field/Field.model.ts']) put(file);
    assert.deepEqual(checkTestPlacement(temporary), [
      'src/Field/props.type-test.ts', 'src/Field/props.typecheck.tsx', 'src/Field/value.test.ts', 'tools/browser/example.spec.ts',
    ]);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
