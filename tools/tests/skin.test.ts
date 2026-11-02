import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateComponentSkin } from '../skin';

const statesModule = '@delba/ui/skin-states';
const effects = new Set(['opacity']);

function withSkinModule(source: string, run: (folder: string, file: string) => Promise<void>) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-skin-'));
  const file = 'DComponent.skin.ts';
  fs.writeFileSync(path.join(folder, file), source);
  return run(folder, file).finally(() => fs.rmSync(folder, { recursive: true, force: true }));
}

test('an explicit null skin skips generation and removes stale generated states', async () => {
  await withSkinModule('export const skin = null;\n', async (folder, file) => {
    const output = path.join(folder, '_states.scss');
    assert.equal(await generateComponentSkin(folder, file, statesModule, effects), false);
    assert.equal(fs.existsSync(output), false);

    fs.writeFileSync(output, 'stale generated output');
    assert.equal(await generateComponentSkin(folder, file, statesModule, effects), true);
    assert.equal(fs.existsSync(output), false);
  });
});

test('missing or malformed skin definitions remain errors', async () => {
  for (const source of ['export {};\n', 'export const skin = {};\n']) {
    await withSkinModule(source, async (folder, file) => {
      await assert.rejects(
        generateComponentSkin(folder, file, statesModule, effects),
        /DComponent\.skin\.ts: нет экспорта defineSkin\(\.\.\.\) или skin = null/,
      );
    });
  }
});

test('valid defineSkin output continues to generate states', async () => {
  await withSkinModule(
    'export const defineSkin = { presets: { primary: { opacity: 1 } } };\n',
    async (folder, file) => {
      assert.equal(await generateComponentSkin(folder, file, statesModule, effects), true);
      assert.match(fs.readFileSync(path.join(folder, '_states.scss'), 'utf8'), /\.skin-primary/);
    },
  );
});
