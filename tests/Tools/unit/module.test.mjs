import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import declaration, { resolveFrontendConfiguration, prepareFrontendSources } from '../../../tools/module.mjs';
import { frontendUtilityOptions } from '../../../tools/configuration.mjs';
import { withFrontend } from '../../../tools/next.mjs';
import { registerFrontendSources } from '../../../tools/registration.mjs';
await registerFrontendSources();
const { starterFrontend } = await import('../../../tools/visual/starter.ts');

test('module declares only its own section and no browser ENV', async () => {
    assert.equal(declaration.id, 'delbaFrontend');
    assert.equal(declaration.command, 'frontend');
    assert.deepEqual(declaration.requires, []);
    assert.deepEqual(declaration.configuration.public, []);
    const settings = starterFrontend;
    const result = await resolveFrontendConfiguration(settings, { PRIVATE_VALUE: 'secret' }, {
        operation: 'build', environment: 'local',
    });
    assert.equal(result.settings, settings);
    assert.deepEqual(result.environment, {});
    assert.deepEqual(result.public, {});
});

test('own schema rejects legacy fields and malformed own values', async () => {
    for (const field of ['root', 'scan', 'seeds', 'rules', 'componentAnatomy', 'themeDefaults',
        'testConcurrency', 'checkConcurrency', 'testConditions', 'profile']) {
        await assert.rejects(resolveFrontendConfiguration({ ...starterFrontend, [field]: {} }), /unsupported/);
    }
    for (const settings of [null, [], { theme: { sources: [] } },
        { theme: { sources: ['theme'], padding: { broken: [1, 2, 3] } } },
        { theme: { sources: ['theme'], scan: [] } }, { scale: { mobile: 0 } },
        { skins: { fills: {}, texts: {}, lines: { invalid: ['wide', 'red'] } } }]) {
        await assert.rejects(resolveFrontendConfiguration(settings));
    }
});

test('generation uses the supplied root and padding without project discovery', async () => {
    const settings = starterFrontend;
    await resolveFrontendConfiguration(settings);
    const options = frontendUtilityOptions(path.resolve('/explicit-root'), settings);
    assert.deepEqual(options.seeds.p, Object.values(settings.geometry.padding));
    assert.deepEqual(options.typography, Object.keys(settings.typography));
    assert.equal(options.scan[0], 'src');
    const owner = readFileSync(new URL('../../../tools/module.mjs', import.meta.url), 'utf8');
    assert.match(owner, /createUtilities\(root, frontendUtilityOptions\(root, config\)\)/);
    assert.doesNotMatch(owner, /loadProjectConfig|resolveConfigFile|delba\.config|readFileSync/);
});

test('native Next requires explicit settings and never accepts config paths', () => {
    assert.throws(() => withFrontend({}), /explicit Frontend settings/);
    assert.throws(() => withFrontend({}, { config: 'delba.config.ts' }), /Unsupported/);
    assert.throws(() => withFrontend({}, { settings: {}, config: 'delba.config.ts' }), /Unsupported/);
    assert.equal(typeof withFrontend({}, { settings: {} }), 'function');
});

test('generator imports do not require their own generated runtime config', () => {
    const motion = readFileSync(new URL('../../../tools/motion.ts', import.meta.url), 'utf8');
    const scrollbar = readFileSync(new URL('../../../tools/scrollbar.ts', import.meta.url), 'utf8');
    assert.match(motion, /base\/motion-timing/);
    assert.doesNotMatch(motion, /from ['"].*base\/timing['"]/);
    assert.match(scrollbar, /import type \{ ScrollbarOptions \}/);
    assert.doesNotMatch(scrollbar, /import \{ scrollbarProps/);
    const timingNames = readFileSync(new URL('../../../src/core/base/motion-timing.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(timingNames, /motion-config/);
});

test('source preparation coalesces in-flight work and never discovers project config', async t => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'frontend-source-prepare-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(path.join(root, 'delba.config.ts'), 'throw new Error("Project configuration must not be imported");');
    const context = { root, settings: starterFrontend };
    const first = prepareFrontendSources(context);
    const concurrent = prepareFrontendSources(context);
    assert.equal(first, concurrent);
    assert.equal(await first, true);
    const repeated = prepareFrontendSources(context);
    assert.notEqual(repeated, first);
    assert.equal(await repeated, true);
});
