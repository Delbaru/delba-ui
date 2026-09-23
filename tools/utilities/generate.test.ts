import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { walk } from './generate';

function put(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'export {};\n', 'utf8');
}

test('кит git-зависимостью в node_modules сканируется, node_modules внутри скана — нет', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-walk-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const kit = path.join(project, 'node_modules', '@delba', 'ui');
  const own = path.join(kit, 'src', 'components', 'Flex', 'Flex.tsx');
  put(own);
  put(path.join(kit, 'node_modules', 'dep', 'index.ts'));
  put(path.join(kit, 'src', 'core', 'box.d.ts'));
  put(path.join(kit, 'src', 'core', 'box.test.ts'));

  assert.deepEqual(walk(kit), [own]);
});

test('папка проекта: node_modules и .next пропускаются', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-walk-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const page = path.join(project, 'src', 'page.tsx');
  put(page);
  put(path.join(project, 'src', 'node_modules', 'x', 'a.tsx'));
  put(path.join(project, 'src', '.next', 'b.ts'));

  assert.deepEqual(walk(path.join(project, 'src')), [page]);
});
