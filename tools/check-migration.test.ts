import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { findLegacy } from './check-migration.mjs';

test('public package entries are accepted and nested private paths remain rejected', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-public-entries-'));
  try {
    fs.writeFileSync(path.join(folder, 'public.ts'), "import { createUrl } from '@delba/ui/url';\nimport eye from '@delba/ui/icons/style-1/eye.svg';\n");
    assert.equal(findLegacy([folder]).length, 0);
    fs.writeFileSync(path.join(folder, 'private.ts'), "import { createUrl } from '@delba/ui/src/core/base/url';\n");
    assert.equal(findLegacy([folder]).length, 1);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
