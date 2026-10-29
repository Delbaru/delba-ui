import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '../src/components/Icon/Icon';
import { parseSvg } from '../src/components/Icon/svg';
import { INLINE_ICONS } from '../src/core/inline-icons';
import { collectInlineIcons, generateInlineIcons } from './icons';

test('generated project icons render their markup on the server before client effects or requests', () => {
    for (const [url, svg] of Object.entries(INLINE_ICONS)) {
        const expected = parseSvg(svg).content;
        const markup = renderToStaticMarkup(createElement(Icon, { src: url, w: [16, 16, 16], h: [16, 16, 16] }));
        if (expected.trim()) assert.ok(markup.includes(expected), `Missing SSR icon: ${url}`);
    }
});

test('public icon manifest includes nested SVGs, updates changed assets and removes deleted assets', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-inline-icons-'));
    try {
        const dir = path.join(root, 'public', 'icons', 'fixture');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'arrow.svg');
        const output = path.join(root, 'generated', 'icons.ts');
        const first = '<svg viewBox="0 0 8 8"><path d="M1 1"/></svg>';
        fs.writeFileSync(file, first);
        fs.writeFileSync(path.join(dir, 'ignore.txt'), 'not an icon');
        assert.deepEqual(collectInlineIcons(root), { '/icons/fixture/arrow.svg': first });
        assert.equal(generateInlineIcons(root, output), true);
        assert.equal(generateInlineIcons(root, output), false);
        assert.match(fs.readFileSync(output, 'utf8'), /arrow\.svg/);
        fs.writeFileSync(file, first.replace('M1 1', 'M2 2'));
        assert.equal(generateInlineIcons(root, output), true);
        assert.match(fs.readFileSync(output, 'utf8'), /M2 2/);
        fs.unlinkSync(file);
        assert.equal(generateInlineIcons(root, output), true);
        assert.match(fs.readFileSync(output, 'utf8'), /= \{\};/);
        assert.deepEqual(collectInlineIcons(path.join(root, 'missing-project')), {});
        fs.writeFileSync(file, 'not an svg');
        assert.throws(() => generateInlineIcons(root, output), /Invalid local SVG/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
