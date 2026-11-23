import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { RULES, countViolations } from '../check-rules.mjs';

test('the product rule gate retains behavioural controls without imposing visual structure', () => {
  assert.deepEqual(Object.keys(RULES).sort(), ['raw-anchor', 'raw-button', 'raw-input']);
});

test('native button, input and anchor still require their shared public contracts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-rules-behavior-'));
  try {
    fs.writeFileSync(path.join(dir, 'Controls.tsx'), [
      'export function Controls() {',
      '  return <><button>Save</button><input type="text" /><a href="/next">Next</a></>;',
      '}',
    ].join('\n'));

    const { counts } = countViolations([dir]);
    for (const name of ['raw-button', 'raw-input', 'raw-anchor']) {
      assert.equal(Object.values(counts[name] ?? {}).reduce((sum, n) => sum + n, 0), 1, name);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('native hidden file picker is allowed without making visible or spread-controlled inputs valid', () => {
  const count = RULES['raw-input'].ast.count;
  assert.equal(count('<input type="file" hidden multiple /><input type="file" hidden={true} />', 'Example.tsx').length, 0);
  assert.equal(count('<input type="text" hidden /><input type="file" /><input type="file" hidden={false} /><input type="file" hidden {...props} />', 'Example.tsx').length, 4);
  assert.equal(count('const example = "<input />"; // <input />', 'Example.tsx').length, 0);
});

test('a verified range owner remains an exception, not a route to an unchecked native input', () => {
  const count = RULES['raw-input'].ast.count;
  const owner = '// @ui-native-control range\nimport styles from "./Range.module.scss"; export function Range() {return <Flex className={styles.Range}><input type="range" min={1} max={12} value={value} onChange={change} /></Flex>;}';

  assert.equal(count(owner, 'Range.tsx').length, 0);
  assert.equal(count(owner + 'function Other(){return <input type="range" min={1} max={12} value={value} onChange={change} />;}', 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('className={styles.Range}', 'className="Range"'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('styles.Range', 'styles.Other'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('styles.Range', 'styles["Range"]'), 'Range.tsx').length, 0);
  assert.equal(count(owner.replace('type="range"', 'type="text"'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('import styles from "./Range.module.scss";', ''), 'Range.tsx').length, 1);
  assert.equal(count('<input type="range" min={1} max={12} value={value} onChange={change} />', 'Page.tsx').length, 1);
});

test('responsive styling, media, zero spacing and conditional visibility do not impose motion or empty roots', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-rules-visual-'));
  try {
    fs.writeFileSync(path.join(dir, 'Example.tsx'),
      `'use client'; export function Example({ visible }) { return <Box>{visible && <Text>Visible</Text>}</Box>; }`);
    fs.writeFileSync(path.join(dir, 'Example.module.scss'),
      '@media (min-width: 1024px) { .inside { padding: 0; flex: none; transition: opacity 120ms; } }');
    const { counts } = countViolations([dir]);
    assert.ok(Object.values(counts).every(files => Object.keys(files).length === 0));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
