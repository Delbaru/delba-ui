import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadProjectConfig, resolveConfigFile } from '../config-loader.mjs';

for (const type of ['commonjs', 'module']) {
    test(`config composition preserves callback identity and reloads fragments (${type})`, async (t) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-config-'));
        t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
        fs.mkdirSync(path.join(directory, 'app'));
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type }));
        const fragment = path.join(directory, 'fragment.ts');
        fs.writeFileSync(fragment, 'export default { root: "app", callback: () => 1 };');
        fs.writeFileSync(
            path.join(directory, 'delba.config.ts'),
            'import ui from "./fragment"; export default { ui };',
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
        const first = await loadProjectConfig({ cwd: path.join(directory, 'app'), profile: 'ui' });
        assert.equal(first.root, path.join(directory, 'app'));
        assert.equal(first.value.callback(), 1);
        const imported = await first.importModule('./fragment.ts');
        assert.equal(first.value, imported.default?.default ?? imported.default);
        assert.ok(first.files.has(fragment), 'imported fragments are observable dependencies');
        await first.close();
        fs.writeFileSync(fragment, 'export default { root: "app", callback: () => 2 };');
        const next = await loadProjectConfig({ cwd: directory, profile: 'ui' });
        assert.equal(next.value.callback(), 2, 'dependency changes are reloaded');
        await next.close();
        const [left, right] = await Promise.all([
            loadProjectConfig({ cwd: directory, profile: 'ui' }),
            loadProjectConfig({ cwd: directory, profile: 'ui' }),
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
        await assert.rejects(loadProjectConfig({ cwd: directory, profile: 'ui' }));
        fs.writeFileSync(bad, 'export default {};');
        const recovered = await loadProjectConfig({ cwd: directory, profile: 'ui' });
        const publicFragment = await recovered.importModule('./fragment.ts');
        assert.equal(
            recovered.value,
            publicFragment.default?.default ?? publicFragment.default,
            'failed-load dependencies must not break public identity after recovery',
        );
        await recovered.close();
    });
}
