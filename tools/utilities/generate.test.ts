import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readPathAliases, walk, watchPathAliases } from './generate';

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

test('path aliases follow inherited config origins and project overrides, and track watch inputs', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-paths-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const configDir = path.join(project, 'config');
  fs.mkdirSync(configDir);
  const inherited = path.join(configDir, 'base.json');
  fs.writeFileSync(inherited, JSON.stringify({ compilerOptions: { baseUrl: '..', paths: { '@shared/*': ['shared/*'] } } }));
  fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ extends: './config/base.json', files: [] }));
  const first = readPathAliases(project);
  assert.deepEqual(first.paths['@shared/*'], [path.join(project, 'shared/*')]);
  assert.ok(first.files.has(inherited));
  fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ extends: './config/base.json', compilerOptions: { paths: { '@local/*': ['local/*'] } }, files: [] }));
  const second = readPathAliases(project);
  assert.equal(second.paths['@shared/*'], undefined);
  assert.deepEqual(second.paths['@local/*'], [path.join(project, 'local/*')]);
});

test('inherited paths without baseUrl resolve relative to their declaring config', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-paths-origin-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, 'config'));
  fs.writeFileSync(path.join(project, 'config/base.json'), JSON.stringify({ compilerOptions: { paths: { '@theme/*': ['theme/*'] } } }));
  fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ extends: './config/base.json', files: [] }));
  assert.deepEqual(readPathAliases(project).paths['@theme/*'], [path.join(project, 'config/theme/*')]);
});

test('watch invalidates the resolver when an inherited JSON config changes', async (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-paths-watch-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const inherited = path.join(project, 'base.json');
  fs.writeFileSync(inherited, JSON.stringify({ compilerOptions: { paths: { '@theme/*': ['before/*'] } } }));
  fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ extends: './base.json', files: [] }));
  const config = readPathAliases(project);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Inherited config change was not observed')), 3000);
    const close = watchPathAliases(config.files, () => { clearTimeout(timer); resolve(); });
    t.after(() => { clearTimeout(timer); close(); });
    fs.writeFileSync(inherited, JSON.stringify({ compilerOptions: { paths: { '@theme/*': ['after/*'] } } }));
  });
  assert.deepEqual(readPathAliases(project).paths['@theme/*'], [path.join(project, 'after/*')]);
});
