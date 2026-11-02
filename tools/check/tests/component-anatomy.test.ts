import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { componentAnatomyRule, visualComponents } from '../rules/component-anatomy.mjs';

function fixture(run: (root: string, write: (name: string, text: string) => void, inspect: (name: string) => Array<{ message: string }>) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-anatomy-'));
  const write = (name: string, text: string) => {
    const file = path.join(root, 'src/components', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const inspect = (name: string) => {
    const file = path.join(root, 'src/components', name);
    return componentAnatomyRule.check(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true), { root });
  };
  try { run(root, write, inspect); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('visual owner requires its own stylesheet, even when all geometry is props', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.tsx', 'export function Panel() { return <Flex />; }');
  assert.match(inspect('Panel/Panel.tsx')[0]?.message ?? '', /отсутствует собственный Panel.module.scss/);
}));

test('empty named selector plus stable DOM marker is valid without dummy CSS', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.module.scss', '@layer ui.components { .Panel {} }');
  write('Panel/Panel.tsx', `import local from './Panel.module.scss'; export function Panel() { return <Flex className={cx('Panel', local.Panel)} />; }`);
  assert.deepEqual(inspect('Panel/Panel.tsx'), []);
}));

test('parent stylesheet imports are rejected regardless of alias', () => fixture((_root, write, inspect) => {
  write('Panel/Child/Child.tsx', `import theme from '../Panel.module.scss'; export function Child() { return <Flex className={theme.Child} />; }`);
  assert.match(inspect('Panel/Child/Child.tsx')[0]?.message ?? '', /SCSS родителя/);
}));

test('className can be owned by the component model/config, never by a sibling', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.module.scss', '.Panel {}');
  write('Panel/Panel.tsx', 'export function Panel() { return <FieldFrame layout={model.layout} />; }');
  write('Panel/Panel.config.ts', `import styles from './Panel.module.scss'; export const layout = { className: cx('Panel', styles.Panel) };`);
  assert.deepEqual(inspect('Panel/Panel.tsx'), []);
  write('Panel/Panel.config.ts', 'export const example = "className: cx(\'Panel\', styles.Panel)";');
  assert.match(inspect('Panel/Panel.tsx')[0]?.message ?? '', /className/);
}));

test('comments, strings, class on another component and stripped-selector-only markers do not prove anatomy', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.module.scss', '/* .Panel {} */ .other {}');
  write('Panel/Panel.tsx', `import styles from './Panel.module.scss'; export function Panel() { return <Flex className={styles.Panel} />; }`);
  assert.equal(inspect('Panel/Panel.tsx').length, 2);
}));

test('hooks, children-only providers, fragment passthrough and render helpers do not get artificial DOM', () => {
  const source = ts.createSourceFile('src/components/Context.tsx', `
    export function Provider({ children }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
    export function Passage({ children }) { return <>{children}</>; }
    export function useState() { return { value: 1 }; }
    function renderText(text) { return <br />; }
  `, ts.ScriptTarget.Latest, true);
  assert.deepEqual(visualComponents(source), []);
});

test('providers with their own rendered surface and internal visual functions are inspected', () => {
  const source = ts.createSourceFile('src/components/Toast.tsx', `
    export function Provider({ children }) { return <Context.Provider>{children}{createPortal(<Flex />, host)}</Context.Provider>; }
    const Item = () => <Text />;
    function Holder() { function Child() { return <Flex />; } return <Child />; }
  `, ts.ScriptTarget.Latest, true);
  assert.deepEqual(visualComponents(source).map((item) => item.name), ['Provider', 'Item', 'Holder', 'Child']);
});

test('same-directory sibling styles are rejected even when the owner has its own module', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.module.scss', '.Panel {}');
  write('Panel/Panel.tsx', `import own from './Panel.module.scss'; import sibling from './Sibling.module.scss'; export function Panel() { return <Flex className={cx('Panel', own.Panel, sibling.row)} />; }`);
  assert.match(inspect('Panel/Panel.tsx')[0]?.message ?? '', /SCSS родителя/);
}));

test('local class variable initializers are followed through aliases', () => fixture((_root, write, inspect) => {
  write('Panel/Panel.module.scss', '.Panel {}');
  write('Panel/Panel.tsx', `import styles from './Panel.module.scss'; export function Panel() { const base = cx('Panel', styles.Panel); const classes = cx(base, extra); return <Flex className={classes} />; }`);
  assert.deepEqual(inspect('Panel/Panel.tsx'), []);
}));

test('reviewed DOM-free adapters are exempt without exempting actual surfaces', () => fixture((_root, write, inspect) => {
  write('Modal/Modal.tsx', 'export function Modal() { return <ModalSurface />; } function DeclarativeModal() { return <ModalSurface />; } function ModalSurface() { return <div />; }');
  assert.equal(inspect('Modal/Modal.tsx').length, 1);
  assert.match(inspect('Modal/Modal.tsx')[0]?.message ?? '', /ModalSurface/);
}));
