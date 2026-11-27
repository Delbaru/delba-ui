import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadProjectConfig, resolveConfigFile } from '../config-loader.mjs';

for (const type of ['commonjs', 'module']) {
    test(`config composition preserves fragment identity and reloads settings (${type})`, async (t) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-config-'));
        t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
        fs.mkdirSync(path.join(directory, 'app'));
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type }));
        const fragment = path.join(directory, 'fragment.ts');
        fs.writeFileSync(fragment, 'export default { typography: ["p1"] };');
        fs.writeFileSync(
            path.join(directory, 'delba.config.ts'),
            'import delbaFrontend from "./fragment"; export default { delbaFrontend };',
        );
        assert.equal(await loadProjectConfig({ cwd: directory, config: null }), null);
        assert.equal(
            typeof (await import('../motion.ts')).validateMotion,
            'function',
            'standalone tooling still has its TS runtime without loading a parent application',
        );
        assert.equal(
            resolveConfigFile({ cwd: path.join(directory, 'app') }),
            path.join(directory, 'delba.config.ts'),
        );
        const first = await loadProjectConfig({ cwd: path.join(directory, 'app') });
        assert.equal(first.root, directory);
        assert.deepEqual(first.value.typography, ['p1']);
        const imported = await first.importModule('./fragment.ts');
        assert.equal(first.value, imported.default?.default ?? imported.default);
        assert.ok(first.files.has(fragment), 'imported fragments are observable dependencies');
        await first.close();
        fs.writeFileSync(fragment, 'export default { typography: ["h1"] };');
        const next = await loadProjectConfig({ cwd: directory });
        assert.deepEqual(next.value.typography, ['h1'], 'dependency changes are reloaded');
        await next.close();
        const [left, right] = await Promise.all([
            loadProjectConfig({ cwd: directory }),
            loadProjectConfig({ cwd: directory }),
        ]);
        await left.close();
        const rightFragment = await right.importModule('./fragment.ts');
        assert.equal(
            right.value,
            rightFragment.default?.default ?? rightFragment.default,
            'closing a session must preserve another active session',
        );
        await right.close();
        const bad = path.join(directory, 'bad.ts');
        fs.writeFileSync(bad, 'export default {');
        fs.appendFileSync(path.join(directory, 'delba.config.ts'), '\nimport "./bad";');
        await assert.rejects(loadProjectConfig({ cwd: directory }));
        fs.writeFileSync(bad, 'export default {};');
        const recovered = await loadProjectConfig({ cwd: directory });
        const publicFragment = await recovered.importModule('./fragment.ts');
        assert.equal(
            recovered.value,
            publicFragment.default?.default ?? publicFragment.default,
            'failed-load dependencies must not break public identity after recovery',
        );
        await recovered.close();
    });
}

test('discovery ignores legacy filenames and stops at checkout boundaries', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-discovery-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const checkout = path.join(directory, 'checkout');
    const nested = path.join(checkout, 'tools');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(directory, 'delba.config.ts'), 'export default { delbaFrontend: {} };');
    fs.writeFileSync(path.join(checkout, '.git'), 'gitdir: elsewhere');
    fs.writeFileSync(path.join(checkout, 'ui.config.ts'), 'throw Error("legacy");');
    assert.equal(resolveConfigFile({ cwd: nested }), null);
    assert.throws(() => resolveConfigFile({ cwd: checkout, config: 'ui.config.ts' }), /delba.config.ts/);
    assert.equal(resolveConfigFile({ cwd: nested, config: '../../delba.config.ts' }), path.join(directory, 'delba.config.ts'));
    const kit = fileURLToPath(new URL('../..', import.meta.url));
    assert.equal(resolveConfigFile({ cwd: path.join(kit, 'tools', 'tests') }), null,
        'standalone library must not discover the parent OS composition');
    fs.writeFileSync(path.join(checkout, 'delba.config.ts'), 'export default { delbaFrontend: {} };');
    assert.equal(resolveConfigFile({ cwd: nested }), path.join(checkout, 'delba.config.ts'));
});

for (const type of ['commonjs', 'module']) {
    test(`only delbaFrontend author settings are accepted (${type})`, async t => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-contract-'));
        t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type }));
        const file = path.join(directory, 'delba.config.ts');
        for (const project of [
            { theme: { sources: ['theme'] } }, { ui: {} }, { delbaFrontend: null },
            { delbaFrontend: [] }, { delbaFrontend: { root: 'app' } },
            { delbaFrontend: { scan: ['app'] } }, { delbaFrontend: { seeds: {} } },
            { delbaFrontend: { theme: 'theme' } },
            { delbaFrontend: { theme: { sources: [] } } },
            { delbaFrontend: { theme: { sources: ['theme'], padding: { broken: [1, 2, 3] } } } },
        ]) {
            fs.writeFileSync(file, `export default ${JSON.stringify(project)};`);
            await assert.rejects(loadProjectConfig({ cwd: directory }), /delbaFrontend|theme.padding/);
        }
        const delbaFrontend = {
            theme: {
                sources: ['src/theme'],
                padding: {
                    none: 0,
                    md: [8, 12],
                    box: [1, 2, 3, 4],
                },
            },
        };
        fs.writeFileSync(file, `export default ${JSON.stringify({ delbaFrontend })};`);
        await assert.rejects(loadProjectConfig({ cwd: directory, profile: 'ui' }), /profile selection/);
        const loaded = await loadProjectConfig({ cwd: directory });
        assert.deepEqual(loaded.value, delbaFrontend);
        assert.equal(loaded.root, directory);
        await loaded.close();
    });
}
