import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import declaration, { resolveFrontendConfiguration } from '../module.mjs';
import { frontendUtilityOptions } from '../configuration.mjs';
import { withFrontend } from '../next.mjs';

test('module declares only its own section and no browser ENV', async () => {
    assert.equal(declaration.id, 'delbaFrontend');
    assert.equal(declaration.command, 'frontend');
    assert.deepEqual(declaration.requires, []);
    assert.deepEqual(declaration.configuration.public, []);
    const settings = { theme: { sources: ['theme'], padding: { field: [8, 12] } } };
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
        await assert.rejects(resolveFrontendConfiguration({ [field]: {} }), /unsupported/);
    }
    for (const settings of [null, [], { theme: { sources: [] } },
        { theme: { sources: ['theme'], padding: { broken: [1, 2, 3] } } },
        { theme: { sources: ['theme'], scan: [] } }, { scale: { mobile: 0 } },
        { skins: { fills: {}, texts: {}, lines: { invalid: ['wide', 'red'] } } }]) {
        await assert.rejects(resolveFrontendConfiguration(settings));
    }
});

test('generation uses the supplied root and padding without project discovery', async () => {
    const settings = { theme: { sources: ['theme'], padding: { none: 0, field: [8, 12] } },
        typography: ['p1'], scale: { desktop: 1440 } };
    await resolveFrontendConfiguration(settings);
    const options = frontendUtilityOptions(path.resolve('/explicit-root'), settings);
    assert.deepEqual(options.seeds.p, [0, [8, 12]]);
    assert.equal(options.typography, settings.typography);
    assert.equal(options.scale, settings.scale);
    assert.equal(options.scan[0], 'src');
    const owner = readFileSync(new URL('../module.mjs', import.meta.url), 'utf8');
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
    const motion = readFileSync(new URL('../motion.ts', import.meta.url), 'utf8');
    const scrollbar = readFileSync(new URL('../scrollbar.ts', import.meta.url), 'utf8');
    assert.match(motion, /base\/motion-timing/);
    assert.doesNotMatch(motion, /from ['"].*base\/timing['"]/);
    assert.match(scrollbar, /import type \{ ScrollbarOptions \}/);
    assert.doesNotMatch(scrollbar, /import \{ scrollbarProps/);
    const timingNames = readFileSync(new URL('../../src/core/base/motion-timing.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(timingNames, /motion-config/);
});
