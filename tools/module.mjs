import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFrontendConfiguration, frontendUtilityOptions } from './configuration.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export { resolveFrontendConfiguration } from './configuration.mjs';
export { generateThemeAxes, vendorEmojiAssets } from './theme-assets.mjs';

/** Generate from explicit owner settings, without importing any host config. */
async function generators({ root, settings }) {
    if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('Frontend root must be absolute');
    const { settings: config } = await resolveFrontendConfiguration(settings);
    const [motion, images, messages, icons, scrollbar, utilities, skins] = await Promise.all([
        import('./motion.ts'), import('./images.ts'), import('./messages.ts'), import('./icons.ts'),
        import('./scrollbar.ts'), import('./utilities/generate.ts'), import('./skin.ts'),
    ]);
    motion.generateMotion(config.motion);
    images.generateImages(config.images);
    messages.generateMessages(config.messages);
    icons.generateInlineIcons(root);
    scrollbar.generateScrollbar(config.scrollbar);
    for (const { level, message } of icons.iconSourceNotices(root)) console[level](message);
    if (config.skins) await skins.generateSkins(root, config.skins);
    return utilities.createUtilities(root, frontendUtilityOptions(root, config));
}

export async function prepareFrontend(context) {
    const utilities = await generators(context);
    if (!utilities.build()) throw new Error('Frontend utility generation failed');
    // Native Next workers inherit the completed generation receipt.
    if (context.env) context.env.DELBA_FRONTEND_OWNER = path.resolve(context.root);
    return true;
}

/** Watch supplied settings; the host owns config reload and must recreate this watcher on edits. */
export async function watchFrontend(context) {
    let utilities = await generators(context);
    const disposers = [];
    let closed = false;
    let closeUtilities;
    let pending = Promise.resolve();
    const rebuild = () => {
        pending = pending.then(async () => {
            if (closed) return;
            closeUtilities?.();
            utilities = await generators(context);
            closeUtilities = utilities.watch(rebuild);
        }).catch(error => console.error(error));
    };
    closeUtilities = utilities.watch(rebuild);
    disposers.push(() => closeUtilities?.());
    for (const directory of [context.settings.skins?.dir, 'public/icons'].filter(Boolean)) {
        const target = path.resolve(context.root, directory);
        if (existsSync(target)) {
            const watcher = watch(target, { recursive: true }, rebuild);
            disposers.push(() => watcher.close());
        }
    }
    if (context.env) context.env.DELBA_FRONTEND_OWNER = path.resolve(context.root);
    return { close() { closed = true; disposers.forEach(close => close()); } };
}

export async function checkFrontend(context) {
    const args = context.args ?? [];
    if (args.includes('--update') || args.includes('--baseline'))
        throw new Error('Frontend checks enforce current rules without baseline waivers');
    const reportIndex = args.indexOf('--report');
    const report = reportIndex < 0 ? undefined : args[reportIndex + 1];
    if (reportIndex >= 0 && (!report || report.startsWith('--'))) throw new Error('--report requires a path');
    const { settings } = await resolveFrontendConfiguration(context.settings);
    const [{ projectSteps }, { runSteps }] = await Promise.all([import('./check/index.mjs'), import('./check/run.mjs')]);
    await prepareFrontend(context);
    return runSteps(projectSteps(context.root, settings, {
        environment: context.env, fix: args.includes('--fix'),
    }), {
        reportFile: path.resolve(context.root, report ?? '.verification/frontend-check.json'),
        failedOnly: args.includes('--failed'),
        profile: { settings, fix: args.includes('--fix') },
    });
}

/** Only Frontend's own units/fixtures. Product suites are owned by their module. */
export async function testFrontend(context) {
    const { runUiChecks } = await import('./check/index.mjs');
    const args = context.args ?? [];
    const value = flag => {
        const index = args.indexOf(flag);
        if (index < 0) return undefined;
        if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
        return args[index + 1];
    };
    return runUiChecks({
        suite: args.includes('--browser') ? 'browser' : 'library',
        failedOnly: args.includes('--failed'), reportFile: value('--report'),
        shard: value('--shard'), fix: args.includes('--fix'),
    });
}

/** Format consumer sources through the host's native Prettier and public Frontend plugin. */
export function formatFrontend(context) {
    const require = createRequire(path.join(context.root, 'package.json'));
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [require.resolve('prettier/bin/prettier.cjs'),
            ...(context.args?.length ? context.args : ['--write', 'src'])], {
            cwd: context.root, env: context.env, stdio: 'inherit', windowsHide: true,
        });
        child.on('error', reject);
        child.on('exit', (code, signal) => {
            if (code === 0) resolve(true);
            else reject(new Error(`Frontend format failed: ${signal ?? code}`));
        });
    });
}

/** Spawn native Next with only the explicit host environment. */
export function runFrontendNext(context, command) {
    if (!['dev', 'build', 'start'].includes(command)) throw new Error(`Unknown Next action: ${command}`);
    if (!context.env || typeof context.env !== 'object') throw new Error('Native Next requires selected host env');
    if (typeof context.root !== 'string' || !path.isAbsolute(context.root)) throw new Error('Frontend root must be absolute');
    const env = { ...context.env, NODE_ENV: command === 'dev' ? 'development' : 'production' };
    // The child prepares Next before its CLI can apply dotenv defaults.
    const require = createRequire(path.join(context.root, 'package.json'));
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL('./next-process.mjs', import.meta.url)), require.resolve('next/dist/bin/next'), command, ...(context.args ?? [])], {
            cwd: context.root, env, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], windowsHide: true,
        });
        const stop = () => child.kill();
        const cleanup = () => {
            process.off('SIGINT', stop);
            process.off('SIGTERM', stop);
        };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        child.on('error', error => { cleanup(); reject(error); });
        child.on('exit', (code, signal) => {
            cleanup();
            if (code === 0) resolve(true);
            else reject(new Error(`Next ${command} failed: ${signal ?? code}`));
        });
    });
}

export default {
    id: 'delbaFrontend',
    command: 'frontend',
    requires: [],
    configuration: { resolve: resolveFrontendConfiguration, public: [] },
    actions: {
        build: prepareFrontend,
        watch: watchFrontend,
        check: checkFrontend,
        test: testFrontend,
        format: formatFrontend,
        startup: async context => (await import('./startup-check.mjs')).checkStartup(context.args ?? []),
        dev: context => runFrontendNext(context, 'dev'),
        start: context => runFrontendNext(context, 'start'),
    },
};
