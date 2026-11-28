import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { registerFrontendSources } from '../../../tools/registration.mjs';

await registerFrontendSources();
const { collectSpacingValues, watchSpacingValues } = await import('../../../tools/visual/spacing.ts');
const { renderFrontendTheme } = await import('../../../tools/visual/render.ts');
const { starterFrontend } = await import('../../../tools/visual/starter.ts');
const { validateFrontend } = await import('../../../tools/visual/validate.ts');

test('spacing tokens follow used source values and config references without a numeric catalog', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-spacing-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(directory, 'Card.scss'), '.Card { padding: var(--s-4000); gap: var(--s-12); }');
    fs.writeFileSync(path.join(directory, 'generated.css'), '/* AUTO-GENERATED */ :root { --old: var(--s-80); }');
    const values = collectSpacingValues([directory], { shadow: '0 var(--s-8) transparent' });
    assert.deepEqual(values, [8, 12, 4000]);
    const result = renderFrontendTheme(starterFrontend, values);
    assert.match(result.css, /--s-4000: calc\(4000 \* var\(--rpx\)\)/);
    assert.doesNotMatch(result.css, /--s-80:/);
    fs.writeFileSync(path.join(directory, 'Card.scss'), '.Card { gap: var(--s-17); }');
    assert.throws(() => collectSpacingValues([directory]), /multiple of four/);
});

test('named spacing roles remain optional while numeric catalogs and reserved variables are rejected', () => {
    const settings = structuredClone(starterFrontend);
    validateFrontend(settings);
    settings.geometry.spaces = { section: 160 };
    validateFrontend(settings);
    settings.geometry.spaces = { '16': 16 };
    assert.throws(() => validateFrontend(settings), /generated from source usage/);
    delete settings.geometry.spaces;
    settings.variables['s-16'] = 16;
    assert.throws(() => validateFrontend(settings), /spacing engine/);
});

test('source watch discovers newly used SCSS and TSX spacing tokens without restarting', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-spacing-watch-'));
    let close = () => {};
    t.after(() => {
        close();
        fs.rmSync(directory, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(directory, 'Card.scss'), '.Card { gap: var(--s-8); }');
    let changed;
    close = watchSpacingValues([directory], {}, values => changed?.(values));
    const nextChange = mutate => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Spacing source change was not observed')), 3000);
        changed = values => {
            clearTimeout(timeout);
            resolve(values);
        };
        mutate();
    });
    assert.deepEqual(await nextChange(() => {
        fs.writeFileSync(path.join(directory, 'Card.scss'), '.Card { gap: var(--s-4000); }');
    }), [4000]);
    assert.deepEqual(await nextChange(() => {
        fs.writeFileSync(path.join(directory, 'Card.tsx'), 'const gap = "var(--s-16)";');
    }), [16, 4000]);
});

test('failed watch initialization closes any source watcher already allocated', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-spacing-cleanup-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const first = path.join(directory, 'first');
    const second = path.join(directory, 'second');
    fs.mkdirSync(first);
    fs.mkdirSync(second);
    let calls = 0;
    let closed = 0;
    t.mock.method(fs, 'watch', () => {
        if (++calls === 2) throw new Error('watch allocation failed');
        return { close: () => closed++ };
    });
    assert.throws(() => watchSpacingValues([first, second], {}, () => {}), /allocation failed/);
    assert.equal(closed, 1);
});
