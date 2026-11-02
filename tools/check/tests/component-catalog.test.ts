import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkComponentCatalog, publicComponents } from '../component-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
test('every public React component, including dedicated package entries, has a spec and catalog row', () => {
  assert.deepEqual(checkComponentCatalog(root), []);
});

test('component inventory includes subpath-only exports and DOM-free public providers', () => {
  const components = publicComponents(root);
  assert.deepEqual(components.find((item: { name: string }) => item.name === 'NativeCarousel')?.entries, ['./carousel']);
  for (const name of ['ModalProvider', 'SmoothScroll', 'CarouselProgress', 'CarouselTimer', 'ScrollbarActivity']) {
    assert.ok(components.some((item: { name: string }) => item.name === name), name);
  }
  assert.ok(!components.some((item: { name: string }) => item.name === 'InputProps' || item.name === 'Transition'));
});

test('catalog diagnostics identify missing source-backed page and row, while excluding type-only and ordinary utilities', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-catalog-'));
  const write = (file: string, text: string) => {
    const target = path.join(temporary, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  try {
    write('package.json', JSON.stringify({ exports: { '.': './src/index.ts', './special': './src/special/index.ts' } }));
    write('tsconfig.json', JSON.stringify({ compilerOptions: { moduleResolution: 'Bundler', module: 'ESNext', jsx: 'preserve' }, include: ['src'] }));
    write('src/index.ts', `export { Panel } from './Panel'; export type { PanelProps } from './Panel'; export { Utility } from './utility';`);
    write('src/Panel.tsx', `export interface PanelProps { title: string }; export function Panel() { return <div />; }`);
    write('src/utility.ts', 'export function Utility() { return 2; }');
    write('src/special/index.ts', `export { Panel } from '../Panel'; export { Special } from './Special';`);
    write('src/special/Special.tsx', 'export function Special() { return null; }');
    write('docs/specs/ui/components/README.md', '[Panel](Panel.md)');
    write('docs/specs/ui/components/Panel.md', '# Panel');
    assert.deepEqual(publicComponents(temporary).map((item: { name: string; entries: string[] }) => ({ name: item.name, entries: item.entries })), [
      { name: 'Panel', entries: ['.', './special'] }, { name: 'Special', entries: ['./special'] },
    ]);
    assert.equal(checkComponentCatalog(temporary).length, 2);
    write('docs/specs/ui/components/Special.md', '# Special');
    assert.match(checkComponentCatalog(temporary)[0] ?? '', /нет строки/);
    write('docs/specs/ui/components/README.md', '[Panel](Panel.md) [Special](Special.md)');
    assert.deepEqual(checkComponentCatalog(temporary), []);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
