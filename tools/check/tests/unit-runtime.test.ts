import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

test('unit runtime treats an existing stylesheet as an empty nonvisual dependency', async () => {
  const stylesheet = await import('../../../src/components/Button/Button.module.scss');
  assert.deepEqual(stylesheet.default, {});
  assert.equal(Object.isFrozen(stylesheet.default), true);
});

test('unit runtime still rejects a missing stylesheet instead of hiding a broken import', async () => {
  await assert.rejects(import(new URL('./missing.module.scss', import.meta.url).href), /Cannot find|ENOENT|ERR_MODULE_NOT_FOUND/);
});


test('CommonJS SSR probes use the same nonvisual stylesheet contract', () => {
  const require = createRequire(import.meta.url);
  const styles = require('../../../src/components/Img/Img.module.scss');
  assert.deepEqual(styles, {});
  assert.equal(Object.isFrozen(styles), true);
});
