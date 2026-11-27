import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateThemeAxes, vendorEmojiAssets } from '../module.mjs';

function fixture(t) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'frontend-theme-assets-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

test('theme axes consume supplied dictionaries, selectors and paths', async t => {
    const root = fixture(t);
    const options = {
        root, directory: 'theme', source: 'theme/axes.ts', rebuildCommand: 'delba app axes',
        fills: { paper: 'var(--paper)' }, lines: { line: [1, 'var(--line)', 'dashed'] },
        texts: { ink: 'var(--ink)' }, iconColors: { icon: 'currentColor' },
        fillClass: name => `fill_${name}`, borderClass: name => `border_${name}`, textClass: name => `text_${name}`,
    };
    assert.equal(await generateThemeAxes(options), 2);
    assert.equal(await generateThemeAxes(options), 0);
    const tokens = readFileSync(path.join(root, 'theme/_axes-tokens.scss'), 'utf8');
    const classes = readFileSync(path.join(root, 'theme/_axes-classes.scss'), 'utf8');
    assert.match(tokens, /\$icon-colors:/);
    assert.match(tokens, /\(1, var\(--line\), dashed\)/);
    assert.match(tokens, /delba app axes/);
    assert.match(classes, /\.fill_paper \{ background: var\(--paper\)/);
    assert.match(classes, /\.border_line .* dashed var\(--line\)/);
    assert.match(classes, /\.text_ink \{ color: var\(--ink\)/);
});

test('emoji pipeline owns pinned SVG validation and license while host owns palette/paths', async t => {
    const root = fixture(t);
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    const urls = [];
    globalThis.fetch = async url => {
        urls.push(String(url));
        return new Response(String(url).endsWith('LICENSE-GRAPHICS') ? 'License\n' : '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
    };
    const options = { root, emojis: ['👍', '👍'], directory: 'emoji', manifest: 'metadata/assets.json' };
    assert.equal(await vendorEmojiAssets(options), 1);
    assert.ok(urls.every(url => url.includes('50c7abfe6813680455781862f7b34305cd1eb9f5')));
    const manifest = JSON.parse(readFileSync(path.join(root, 'metadata/assets.json'), 'utf8'));
    assert.equal(manifest.assets['👍'].file, '1f44d.svg');
    assert.match(manifest.assets['👍'].sha256, /^[a-f0-9]{64}$/);
    assert.match(readFileSync(path.join(root, 'emoji/ATTRIBUTION.txt'), 'utf8'), /Only the host palette/);
    globalThis.fetch = async () => new Response('<svg><script/></svg>');
    await assert.rejects(vendorEmojiAssets(options), /Unsafe emoji SVG/);
});
