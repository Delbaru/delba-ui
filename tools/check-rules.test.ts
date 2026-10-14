import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { RULES, countViolations } from './check-rules.mjs';

const hit = (rule: keyof typeof RULES, line: string) => {
    const def = RULES[rule] as { test?: (line: string) => boolean };
    return def.test?.(line) ?? false;
};

test('client CMS labels do not require an appearance animation', () => {
    const count = RULES['unanimated-conditional'].ast.count;
    assert.equal(count(`'use client';
        function Button({ text }: { text?: string }) {
            const label = text || undefined;
            const hasLabel = !!label;
            return <Flex>{label && (<Text>{label}</Text>)}{hasLabel && <Text>Label exists</Text>}</Flex>;
        }`, 'Button.tsx').length, 0);
});

test('reactive and controlled conditional JSX is detected regardless of formatting', () => {
    const count = RULES['unanimated-conditional'].ast.count;
    for (const child of ['visible && (<Text>Panel</Text>)', 'visible && <Text>Panel</Text>', 'visible ? <Text>Panel</Text> : null']) {
        assert.equal(count(`import { useState as state } from 'react';
            function Panel() { const [open] = state(false); const visible = open; return <Flex>{${child}}</Flex>; }
        `, 'Panel.tsx').length, 1);
    }
    assert.equal(count('function Panel({ open }: { open: boolean }) { return <Flex>{open && <Text>Panel</Text>}</Flex>; }', 'Panel.tsx').length, 1);
});

test('thin line sizes are allowed while spacing still follows the four-unit rhythm', () => {
    const count = RULES['off-grid-number'].count;
    assert.equal(count('<Box h={[1, 1, 1]} w={[2, 2, 2]} />'), 0);
    assert.equal(count('<Flex p={[1, 1, 1]} gap={[2, 2, 2]} />'), 2);
    assert.equal(count('<Box h={[3, 3, 3]} />'), 1);
});

test('проп раньше SCSS: нулевые поля, flex: none, переопределение токена темы', () => {
    assert.equal(hit('scss-zero-spacing', '    margin: 0;'), true);
    assert.equal(hit('scss-zero-spacing', '    padding-top: 0;'), true);
    assert.equal(hit('scss-zero-spacing', '    margin: 0 auto;'), false);
    assert.equal(hit('scss-flex-none', '    flex: none;'), true);
    assert.equal(hit('scss-flex-none', '    flex: 1;'), false);
    assert.equal(hit('scss-theme-rescope', '    --text: var(--black);'), true);
    assert.equal(hit('scss-theme-rescope', '    --guide-line: linear-gradient(var(--guide), var(--guide));'), false);
});

test('отступ между соседями — gap, значение — литерал на месте', () => {
    assert.equal(hit('margin-between', '<Grid columns={[2, 1, 1]} mt={[48, 32, 40]}>'), true);
    assert.equal(hit('margin-between', '<Grid ml={[0, 0, 0]}>'), false);
    assert.equal(hit('const-tuple', "<Flex borderT={[LINE, LINE, LINE]}>"), true);
    assert.equal(hit('const-tuple', '<Flex borderT={LINE}>'), true);
    assert.equal(hit('const-tuple', "<Flex className={styles.Programs} gap={[8, 8, 8]}>"), false);
});

test('корневой класс модуля = имя файла', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
    fs.writeFileSync(path.join(dir, 'Card.module.scss'), '.Card {\n    .photo {overflow: hidden;}\n}\n');
    fs.writeFileSync(path.join(dir, 'Box.module.scss'), '.skin {\n    transition: var(--t-fast);\n}\n');

    const { counts } = countViolations([dir]);
    const files = Object.keys(counts['module-root-class']).map((file) => path.basename(file));
    assert.deepEqual(files, ['Box.module.scss']);
    fs.rmSync(dir, { recursive: true, force: true });
});
