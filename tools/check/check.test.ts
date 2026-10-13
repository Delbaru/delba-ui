import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

import { check, projectRules } from './architecture.mjs';
import { collapseRule } from './rules/collapse.mjs';
import { domRefRule } from './rules/dom-ref.mjs';
import { formatCheck } from './format.mjs';
import { projectSteps } from './index.mjs';
import { jsxFormatRule } from './rules/jsx-format.mjs';

const root = path.resolve('fixture');
const sourceOf = (code: string, file: string) => ts.createSourceFile(path.join(root, file), code, ts.ScriptTarget.Latest, true);
const inspect = (code: string, file = 'src/components/Panel.tsx') => collapseRule.check(sourceOf(code, file), { root });
const inspectRef = (code: string, file = 'src/components/Field.tsx') => domRefRule.check(sourceOf(code, file));
const places = (found: Array<{ line: number; column: number }>) => found.map(({ line, column }) => `${line}:${column}`);

test('именованный импорт движка запрещён, включая alias и barrel index.js', () => {
    for (const module of ['../core', '../core/index.js', '../core/base/collapse']) {
        const found = inspect(`\nimport { animateCollapse as run } from '${module}';`);
        assert.equal(found.length, 1);
        assert.equal(found[0]?.line, 2);
        assert.equal(found[0]?.column, 10);
    }
});

test('компонент с CollapseWrap и общий хук с движком разрешены', () => {
    assert.deepEqual(inspect("import { CollapseWrap } from './Collapse/CollapseWrap';"), []);
    assert.deepEqual(inspect("import { animateCollapse } from '../core';", 'src/hooks/useCollapseMotion.ts'), []);
});

test('реэкспорт движка из компонента запрещён, включая переименование', () => {
    for (const statement of [
        "export { animateCollapse } from '../core';",
        "export { animateCollapse as run } from '../core/index.js';",
        "export { animateCollapse as run } from '../core/base/collapse.js';",
    ]) {
        const found = inspect(`\n${statement}`);
        assert.equal(found.length, 1);
        assert.equal(found[0]?.line, 2);
        assert.equal(found[0]?.column, 10);
        assert.match(found[0]?.message ?? '', /реэкспорт/);
    }
    assert.deepEqual(inspect("export { animateCollapse } from './base/collapse';", 'src/core/index.ts'), []);
});

test('типы, комментарии, строковые примеры и одноимённый экспорт другого модуля не запрещаются', () => {
    assert.deepEqual(inspect(`
        import type { animateCollapse } from '../core';
        import { type animateCollapse as Engine, cx } from '../core';
        import { animateCollapse } from './unrelated';
        export type { animateCollapse } from '../core';
        export { type animateCollapse as Engine, cx } from '../core';
        export { animateCollapse } from './unrelated';
        // import { animateCollapse } from '../core';
        const example = "import { animateCollapse } from '../core'";
    `), []);
});

test('namespace ядра: запрещено только доказанное чтение движка', () => {
    assert.deepEqual(places(inspect(`import * as core from '../core';
core.animateCollapse(nodes, options);
core['animateCollapse'];
const { animateCollapse: run } = core;
const { ['animateCollapse']: other } = core;`)), ['2:6', '3:6', '4:9', '5:9']);
    assert.match(inspect("import * as core from '../core/index.js';\ncore.animateCollapse();")[0]?.message ?? '', /namespace/);
});

test('namespace ядра ради других помощников, type-only и затенённое имя разрешены', () => {
    assert.deepEqual(inspect(`
        import * as core from '../core';
        import type * as types from '../core';
        core.cx('a', 'b');
        type Engine = typeof core.animateCollapse;
        type Same = typeof types.animateCollapse;
        function local(core: { animateCollapse(): void }) { core.animateCollapse(); }
        const nested = () => { const core = { animateCollapse() {} }; core.animateCollapse(); };
    `), []);
    assert.deepEqual(inspect("import * as core from '../core';\ncore.animateCollapse();", 'src/hooks/useCollapseMotion.ts'), []);
});

test('export * и export * as из входов ядра запрещены, type-only и другие модули разрешены', () => {
    assert.deepEqual(places(inspect(`export * from '../core';
export * from '../core/base/collapse.js';
export * as core from '../core';`)), ['1:1', '2:1', '3:8']);
    assert.deepEqual(inspect(`
        export type * from '../core';
        export type * as types from '../core';
        export * from './Collapse/CollapseWrap';
    `), []);
});

test('динамический импорт движка запрещён во всех доказуемых формах', () => {
    assert.deepEqual(places(inspect(`async function load() {
  const { animateCollapse } = await import('../core');
  (await import('../core/base/collapse')).animateCollapse;
  const engine = await import('../core/index.js');
  engine.animateCollapse();
  import('../core').then((core) => core.animateCollapse);
  import('../core').then(({ animateCollapse: run }) => run);
}`)), ['2:11', '3:43', '5:10', '6:41', '7:29']);
    assert.match(inspect("import('../core').then(({ animateCollapse }) => animateCollapse);")[0]?.message ?? '', /Динамический/);
});

test('динамический импорт ради других помощников и типы import() разрешены', () => {
    assert.deepEqual(inspect(`
        type Core = typeof import('../core');
        type Engine = typeof import('../core')['animateCollapse'];
        async function load() {
            const { cx } = await import('../core');
            const core = await import('../core');
            core.cx('a');
            import('../core').then((m) => m.cx);
            const { animateCollapse } = await import('./unrelated');
            return [cx, animateCollapse];
        }
    `), []);
});

test('одноразовая передача DOM-узла через useImperativeHandle запрещена', () => {
    assert.deepEqual(places(inspectRef(`import React, { useImperativeHandle, useImperativeHandle as useHandle } from 'react';
import * as R from 'react';
useImperativeHandle(ref, () => inner.current, []);
useHandle(ref, () => inner.current!, []);
React.useImperativeHandle(ref, () => { return inner.current; }, []);
R.useImperativeHandle(ref, function () { return inner.current as HTMLInputElement; }, []);`)), ['3:1', '4:1', '5:1', '6:1']);
    assert.match(inspectRef("import { useImperativeHandle } from 'react';\nuseImperativeHandle(ref, () => inner.current, []);")[0]?.fix ?? '', /useMergedRefs/);
});

test('ручки с методами, непустые зависимости и чужой хук разрешены', () => {
    assert.deepEqual(inspectRef(`
        import { useImperativeHandle } from 'react';
        import type { useImperativeHandle as Typed } from 'react';
        useImperativeHandle(handleRef, () => handle, [handle]);
        useImperativeHandle(ref, () => ({ focus: () => inner.current?.focus() }), []);
        useImperativeHandle(ref, () => inner.current, [node]);
        useImperativeHandle(ref, () => inner.current);
        function scoped(useImperativeHandle: (...args: unknown[]) => void) { useImperativeHandle(ref, () => inner.current, []); }
    `), []);
    assert.deepEqual(inspectRef("import { useImperativeHandle } from './local';\nuseImperativeHandle(ref, () => inner.current, []);"), []);
});

test('проект получает общее правило отдельным шагом, ссылка ведёт в договор кита', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-check-'));
    try {
        fs.mkdirSync(path.join(project, 'src'));
        fs.writeFileSync(path.join(project, 'src', 'Field.tsx'), "import { useImperativeHandle } from 'react';\nuseImperativeHandle(ref, () => inner.current, []);\n");
        const found = check(project, { rules: projectRules });
        assert.equal(found.length, 1);
        assert.equal(found[0]?.rule, 'dom-ref');
        assert.match(found[0]?.docs ?? '', /delba-ui[\\/]docs[\\/]authoring\.md$/);
        assert.equal(projectSteps(project, {}).at(-1)?.name, 'Архитектура проекта');
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test('архитектурный обход пропускает typecheck и type-test примеры', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-check-fixtures-'));
    const visited: string[] = [];
    const rule = {
        id: 'scan-test', docs: 'docs/authoring.md',
        check(source: ts.SourceFile) { visited.push(path.basename(source.fileName)); return []; },
    };
    try {
        fs.mkdirSync(path.join(project, 'src'));
        for (const file of ['Live.tsx', 'Select.typecheck.tsx', 'Input.type-test.tsx', 'Panel.test.tsx']) {
            fs.writeFileSync(path.join(project, 'src', file), 'export {};');
        }
        check(project, { rules: [rule] });
        assert.deepEqual(visited, ['Live.tsx']);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test('архитектурный fixer меняет только TSX по явному запросу и не трогает generic TypeScript', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-architecture-fix-'));
    try {
        const src = path.join(project, 'src');
        fs.mkdirSync(src);
        const tsx = path.join(src, 'View.tsx');
        const tsFile = path.join(src, 'identity.ts');
        const before = '<Card\n  role="group"\n  id="card"\n/>;\n';
        const generic = 'export const identity = <T,>(value: T): T => value;\n';
        fs.writeFileSync(tsx, before);
        fs.writeFileSync(tsFile, generic);

        assert.equal(check(project, { rules: [jsxFormatRule] }).length, 1);
        assert.equal(fs.readFileSync(tsx, 'utf8'), before);
        assert.equal(check(project, { rules: [jsxFormatRule], fix: true }).length, 0);
        assert.equal(fs.readFileSync(tsx, 'utf8'), '<Card role="group" id="card" />;\n');
        assert.equal(fs.readFileSync(tsFile, 'utf8'), generic);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test('единый шаг проверяет JSX без изменений и форматирует только при --fix', async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-jsx-fix-'));
    try {
        fs.mkdirSync(path.join(project, 'src'));
        const file = path.join(project, 'src', 'View.tsx');
        const before = '<Card role="group" id="card"><Text>\n  {label}\n</Text></Card>';
        fs.writeFileSync(file, before);
        fs.writeFileSync(path.join(project, '.rules-baseline.json'), JSON.stringify({ 'jsx-format': {} }));
        const checkStep = projectSteps(project, {}).at(0);
        assert.equal((await checkStep?.run())?.ok, false);
        assert.equal(fs.readFileSync(file, 'utf8'), before);
        const fixStep = projectSteps(project, {}, { fix: true }).at(0);
        assert.equal((await fixStep?.run())?.ok, true);
        assert.match(fs.readFileSync(file, 'utf8'), /<Text>\{label\}<\/Text>/);
        assert.equal((await checkStep?.run())?.ok, true);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test('успех занимает одну строку; ошибка содержит место, исправление и ссылку', () => {
    assert.equal(formatCheck('UI', []), '✓ UI — все проверки прошли');
    const result = formatCheck('UI', [{
        file: path.join(root, 'src', 'Panel.tsx'), line: 12, column: 5,
        message: 'Прямой импорт запрещён.', fix: 'Используйте CollapseWrap.',
        docs: path.join(root, 'docs', 'authoring.md'),
    }], { cwd: root });
    assert.match(result, /src\/Panel.tsx:12:5/);
    assert.match(result, /Используйте CollapseWrap\./);
    assert.match(result, /Правило: file:\/\//);
    assert.equal(result.includes('\u001b'), false);
    assert.equal(formatCheck('UI', [], { color: true }), '\u001b[32m✓\u001b[0m UI — все проверки прошли');
});
