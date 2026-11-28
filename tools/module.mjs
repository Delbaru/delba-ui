import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFrontendConfiguration, frontendUtilityOptions } from './configuration.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export { resolveFrontendConfiguration } from './configuration.mjs';
export { vendorEmojiAssets } from './theme-assets.mjs';

/** Generate from explicit owner settings, without importing any host config. */
async function generateSources({ root, settings }) {
    if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('Frontend root must be absolute');
    const { settings: config } = await resolveFrontendConfiguration(settings);
    const { generateFrontendTheme } = await import('./visual/generate.ts');
    const { collectSpacingValues } = await import('./visual/spacing.ts');
    const spacingValues = collectSpacingValues([path.join(root, 'src'), path.join(KIT, 'src')], config);
    generateFrontendTheme(config, spacingValues);
    const [motion, images, messages, icons, scrollbar] = await Promise.all([
        import('./motion.ts'), import('./images.ts'), import('./messages.ts'), import('./icons.ts'),
        import('./scrollbar.ts'),
    ]);
    motion.generateMotion(config.motion);
    images.generateImages(config.images);
    messages.generateMessages(config.messages);
    icons.generateInlineIcons(root);
    scrollbar.generateScrollbar(config.scrollbar);
    for (const { level, message } of icons.iconSourceNotices(root)) console[level](message);
    return true;
}

const sourcePreparations = new WeakMap();

/** Prepare imported source projections without running CSS extraction or any acceptance gate. */
export function prepareFrontendSources(context) {
    if (!context.settings || typeof context.settings !== 'object')
        return Promise.reject(new Error('Frontend settings are required'));
    if (typeof context.root !== 'string' || !path.isAbsolute(context.root))
        return Promise.reject(new Error('Frontend root must be absolute'));
    const root = path.resolve(context.root);
    const running = sourcePreparations.get(context.settings) ?? new Map();
    sourcePreparations.set(context.settings, running);
    const existing = running.get(root);
    if (existing) return existing;
    const preparation = generateSources({ ...context, root }).finally(() => {
        if (running.get(root) === preparation) running.delete(root);
        if (!running.size) sourcePreparations.delete(context.settings);
    });
    running.set(root, preparation);
    return preparation;
}

async function generators(context) {
    await prepareFrontendSources(context);
    const { createUtilities } = await import('./utilities/generate.ts');
    return createUtilities(context.root, frontendUtilityOptions(context.root, context.settings));
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
    const [{ watchSpacingValues }, { generateFrontendTheme }] = await Promise.all([
        import('./visual/spacing.ts'), import('./visual/generate.ts'),
    ]);
    let closed = false;
    let closeUtilities;
    let pending = Promise.resolve();
    try {
        disposers.push(watchSpacingValues(
            [path.join(context.root, 'src'), path.join(KIT, 'src')],
            context.settings,
            values => { generateFrontendTheme(context.settings, values); },
        ));
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
        for (const directory of ['public/icons']) {
            const target = path.resolve(context.root, directory);
            if (existsSync(target)) {
                const watcher = watch(target, { recursive: true }, rebuild);
                disposers.push(() => watcher.close());
            }
        }
    } catch (error) {
        closed = true;
        disposers.forEach(close => close());
        throw error;
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
    const options = { suite: 'library', failedOnly: false, fix: false };
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--failed') {
            options.failedOnly = true;
        } else if (argument === '--fix') {
            options.fix = true;
        } else if (argument === '--report') {
            const reportFile = args[index + 1];
            if (!reportFile || reportFile.startsWith('--')) throw new Error('--report requires a value');
            options.reportFile = reportFile;
            index += 1;
        } else {
            throw new Error(`Unsupported Frontend test argument: ${argument}`);
        }
    }
    return runUiChecks(options);
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
        prepare: prepareFrontendSources,
        build: prepareFrontend,
        watch: watchFrontend,
        check: checkFrontend,
        test: testFrontend,
        format: formatFrontend,
        dev: context => runFrontendNext(context, 'dev'),
        start: context => runFrontendNext(context, 'start'),
    },
};
