import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = new URL('../next-env.mjs', import.meta.url).href;
const plugin = new URL('../next.mjs', import.meta.url).href;
const root = fileURLToPath(new URL('../../', import.meta.url));

function execute(source) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        cwd: root, encoding: 'utf8', env: { ...process.env, DELBA_PUBLIC_ENV: '{}' },
    });
    assert.equal(result.status, 0, result.stderr);
}

test('selected host ENV replaces stale Next initialEnv and rejects unprojected public keys', () => {
    execute(`
        import assert from 'node:assert/strict';
        import { createRequire } from 'node:module';
        import { prepareNextEnvironment } from ${JSON.stringify(helper)};
        const require = createRequire(import.meta.url);
        const next = createRequire(require.resolve('next/package.json'))('@next/env');
        next.processEnv([], undefined);
        next.updateInitialEnv({ STALE_HOST_SECRET: 'old' });
        assert.throws(() => prepareNextEnvironment({ NEXT_PUBLIC_LEAK: 'secret' }), /public projection/);
        assert.throws(() => prepareNextEnvironment({ DELBA_PUBLIC_ENV: '{"bad":{}}' }), /Invalid public/);
        const selected = { DELBA_ENV: 'test', HOST_SECRET: 'private',
            DELBA_PUBLIC_ENV: '{"NEXT_PUBLIC_LABEL":"public","PUBLIC_FLAG":true,"PUBLIC_EMPTY":null}' };
        const projection = prepareNextEnvironment(selected);
        assert.equal(process.env.STALE_HOST_SECRET, undefined);
        assert.equal(process.env.HOST_SECRET, 'private');
        assert.equal(next.initialEnv.__NEXT_PROCESSED_ENV, 'true');
        assert.equal(process.env.NEXT_PUBLIC_LABEL, 'public');
        next.processEnv([{path: '.env.local', contents: 'CASCADE_LEAK=bad', env: {}}]);
        assert.equal(process.env.CASCADE_LEAK, undefined);
        assert.equal(process.env.PUBLIC_EMPTY, 'null');
        assert.deepEqual(projection, { NEXT_PUBLIC_LABEL: 'public', PUBLIC_FLAG: true, PUBLIC_EMPTY: null });
    `);
});

test('Next receives only explicit public projection and never server secrets', () => {
    execute(`
        import assert from 'node:assert/strict';
        import { prepareNextEnvironment } from ${JSON.stringify(helper)};
        import { withFrontend } from ${JSON.stringify(plugin)};
        prepareNextEnvironment({ HOST_SECRET: 'private', DELBA_PUBLIC_ENV: '{"NEXT_PUBLIC_LABEL":"public"}' });
        const config = await withFrontend({}, {settings:{}})('phase-production-server', {});
        assert.deepEqual(config.env, { NEXT_PUBLIC_LABEL: 'public' });
        await assert.rejects(withFrontend({env:{HOST_SECRET:'private'}}, {settings:{}})('phase-production-server', {}), /public projection/);
    `);
});
