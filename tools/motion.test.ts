import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

import type { UiMotion } from './config';
import { motionScss, validateMotion, writeMotionScss } from './motion';

const validMotion = {
  timing: {
    flash: 0.06,
    fast: 0.16,
    gentleEase: 0.42,
  },
  distance: { small: 16, full: '100%' },
} as const satisfies UiMotion;

test('project timing types follow config keys, including custom names and renames', () => {
  const fixture = path.join(import.meta.dirname, 'motion-types.fixture.ts');
  const source = `
    import type { MotionTime } from '../src/core/base/timing';
    import type { MotionDistance } from '../src/core/base/distance';
    const config = { motion: { timing: { gentleEase: 0.42 }, distance: { full: '100%', compact: 16 } } };
    declare global {
      interface UiMotionTiming { names: keyof typeof config.motion.timing; }
      interface UiMotionDistance { names: keyof typeof config.motion.distance; }
    }
    const named: MotionTime = 'gentleEase';
    const exact: MotionTime = 0.16;
    // @ts-expect-error names absent from config cannot be used
    const oldName: MotionTime = 'slow';
    // @ts-expect-error misspelled names cannot be used
    const typo: MotionTime = 'gentleEsae';
    const namedDistance: MotionDistance = 'full';
    const percentDistance: MotionDistance = '100%';
    const exactDistance: MotionDistance = 24;
    // @ts-expect-error names absent from config cannot be used
    const oldDistance: MotionDistance = 'large';
  `;
  const options: ts.CompilerOptions = { strict: true, noEmit: true, types: [], target: ts.ScriptTarget.ES2022 };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(file) === fixture
      ? ts.createSourceFile(file, source, languageVersion, true)
      : getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.deepEqual(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
});

test('UiMotion accepts arbitrary readonly timing names and keeps values numeric', () => {
  const readonlyMotion = { timing: { quick: 0.1, veryGentle: 0.7 } } as const satisfies UiMotion;
  assert.doesNotThrow(() => validateMotion(readonlyMotion));

  // @ts-expect-error duration values are numbers in seconds
  const invalidValue: UiMotion = { timing: { quick: '0.1s' } };
  void invalidValue;
});

test('validateMotion accepts absence and a non-empty custom timing map', () => {
  assert.doesNotThrow(() => validateMotion(undefined));
  assert.doesNotThrow(() => validateMotion(validMotion));
  assert.doesNotThrow(() => validateMotion({ timing: { normal: 0 } }));
});

test('validateMotion rejects malformed objects, empty maps, invalid names and invalid durations', () => {
  assert.throws(() => validateMotion(null), /motion must be an object/);
  assert.throws(() => validateMotion({ timing: validMotion.timing, extra: true }), /motion\.extra/);
  assert.throws(() => validateMotion({}), /motion\.timing is required/);
  assert.throws(() => validateMotion(Object.create({ timing: validMotion.timing })), /motion must be an object/);
  assert.throws(() => validateMotion({ timing: {} }), /motion\.timing must contain at least one duration/);
  assert.throws(() => validateMotion({ timing: { fast: 0.1 }, distance: {} }), /motion\.distance must contain at least one distance/);
  assert.throws(() => validateMotion({ timing: [] }), /motion\.timing must be an object/);
  assert.throws(() => validateMotion({ timing: Object.create({ fast: 0.1 }) }), /motion\.timing must be an object/);

  for (const name of ['very-fast', 'Fast', '_quick', 'quick-fast', '2x']) {
    assert.throws(() => validateMotion({ timing: { [name]: 0.2 } }), new RegExp(`motion\\.timing\\.${name} must be a camelCase name`));
  }

  for (const value of [NaN, Infinity, -Infinity, -0.1, '0.2']) {
    assert.throws(
      () => validateMotion({ timing: { slow: value } }),
      /motion\.timing\.slow must be a finite non-negative number of seconds/,
    );
  }
  for (const value of ['calc(100% - 1px)', 'var(--x)', '-100%', '100vh', 'small', '100', Infinity, -1]) {
    assert.throws(() => validateMotion({ timing: { fast: 0.1 }, distance: { full: value } }), /motion\.distance\.full must be/);
  }
  assert.throws(() => validateMotion({ timing: { fast: 0.1 }, distance: { 'bad-name': 12 } }), /motion\.distance\.bad-name must be a camelCase name/);
});

test('motionScss emits config entries in their declared order or a comment-only partial when unset', () => {
  assert.equal(motionScss(undefined), '// AUTO-GENERATED: no motion timings configured in ui.config.ts.\n');
  assert.equal(motionScss(validMotion), [
    '// AUTO-GENERATED: tools/motion.ts (ui.config.ts). Do not edit.',
    ':root {',
    '  --t-d-flash: 0.06s;',
    '  --t-d-fast: 0.16s;',
    '  --t-d-gentle-ease: 0.42s;',
    '  --t-m-distance-small: calc(var(--rpx) * 16);',
    '  --t-m-distance-full: 100%;',
    '}',
    '',
  ].join('\n'));
});

test('writeMotionScss writes only on content changes', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-motion-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, '_motion.scss');

  assert.equal(writeMotionScss(output, validMotion), true);
  assert.equal(fs.readFileSync(output, 'utf8'), motionScss(validMotion));
  assert.equal(writeMotionScss(output, validMotion), false);
  assert.equal(writeMotionScss(output), true);
  assert.equal(fs.readFileSync(output, 'utf8'), motionScss(undefined));
});
