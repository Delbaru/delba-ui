import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { check, projectRules } from './architecture.mjs';
import { runNode, runSteps } from './run.mjs';
import { runNodeTests } from './verify.mjs';
import { discoverTests } from './discovery.mjs';

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.dirname(TOOLS);
const require = createRequire(import.meta.url);
const script = (name) => path.join(TOOLS, name);
const nodeStep = (name, args, cwd = KIT, environment) => ({ name, run: () => runNode(args, cwd, { environment }) });
const astStep = (name, ...args) => ({
    name,
    run: () => {
        const diagnostics = check(...args);
        const blocking = diagnostics.filter(item => item.severity !== 'warning');
        const warnings = diagnostics.filter(item => item.severity === 'warning');
        return {
            ok: blocking.length === 0,
            diagnostics,
            warnings: warnings.map(item => `${item.file}:${item.line}:${item.column} ${item.message}`).join('\n') || undefined,
            output: blocking.map(item => `${item.file}:${item.line}:${item.column} ${item.message}`).join('\n') || undefined,
        };
    },
});

/** Own Playwright's saved selection; never attest stale state after an early runner failure. */
export async function runBrowserTests({ root = KIT, reportFile, failedOnly = false, shard } = {}) {
    const state = path.join(root, 'tools/browser/.test-results/.last-run.json');
    const receipt = `${reportFile}.browser-state.json`;
    const digest = () => createHash('sha256').update(readFileSync(state)).digest('hex');
    const stamp = () => {
        const stat = statSync(state, { bigint: true });
        return `${stat.mtimeNs}:${stat.ctimeNs}`;
    };
    let previousStamp;
    if (failedOnly) {
        try {
            const previous = JSON.parse(readFileSync(state, 'utf8'));
            if (previous.status !== 'failed' || !previous.failedTests?.length ||
                JSON.parse(readFileSync(receipt, 'utf8')).hash !== digest()) {
                return { ok: false, output: '--failed requires matching failed Playwright state.' };
            }
            previousStamp = stamp();
        } catch {
            return { ok: false, output: '--failed requires previous Playwright state.' };
        }
    } else {
        rmSync(state, { force: true });
    }
    // A retry still needs .last-run as input, but its old receipt must not survive.
    rmSync(receipt, { force: true });
    const result = await runNode([
        require.resolve('@playwright/test/cli'), 'test',
        '--config', 'tools/browser/playwright.config.ts',
        ...(shard ? ['--shard', shard] : []),
        ...(failedOnly ? ['--last-failed'] : []),
    ], root);
    if (existsSync(state) && (!failedOnly || stamp() !== previousStamp)) {
        mkdirSync(path.dirname(receipt), { recursive: true });
        writeFileSync(receipt, JSON.stringify({ hash: digest() }));
    }
    return result;
}

/** Один список шагов для быстрой проверки проекта и полной проверки UI. */
export function projectSteps(
    root,
    config,
    { strict = false, fix = false, configFiles = [], environment } = {},
) {
    const configs = [
        ...new Set([
            ...readdirSync(root).filter((file) => /^(next|delba)\.config\./.test(file)),
            ...configFiles,
        ]),
    ];
    return [
        nodeStep(
            'Правила проекта',
            [
                script('check-rules.mjs'),
                ...(fix ? ['--fix'] : []),
                'src',
            ],
            root,
            environment,
        ),
        nodeStep(
            'Тема',
            [
                script('check-tokens.mjs'),
                ...(strict ? ['--strict'] : []),
                ...(config.theme?.sources ?? ['theme']),
                ...(config.motion
                    ? ['--generated-motion', path.join(KIT, 'src/core/_motion.scss')]
                    : []),
                ...(config.typography ? ['--typography', config.typography.join(',')] : []),
            ],
            root,
            environment,
        ),
        nodeStep(
            'Импорты',
            [script('check-migration.mjs'), 'src', ...configs],
            root,
            environment,
        ),
        nodeStep(
            'Анатомия D-компонентов',
            [script('check-d-component-anatomy.mjs'), '--single-config'],
            root,
            environment,
        ),
        astStep('Архитектура проекта', root, {
            rules: projectRules,
            dirs: ['src'],
            includeBoundaries: true,
            mode: 'consumer',
        }),
    ];
}

export { discoverTests } from './discovery.mjs';

/** Library verification only. Consumer checks are exposed separately as projectSteps. */
export function uiCheckSteps({ suite = 'standard', reportFile = path.join(KIT, '.verification', `ui-${suite}.json`),
    shard, fix = false, ...unsupported } = {}) {
    for (const key of Object.keys(unsupported)) {
        if (unsupported[key] !== undefined) throw new Error(`Unsupported Frontend verification option: ${key}`);
    }
    if (!['standard', 'all', 'library', 'browser'].includes(suite)) throw new Error(`Unknown UI suite: ${suite}`);
    if (shard !== undefined) {
        const match = /^(\d+)\/(\d+)$/.exec(shard);
        if (suite !== 'browser' || !match || +match[1] < 1 || +match[1] > +match[2])
            throw new Error('--shard requires --suite browser and a valid index/total');
    }
    const libraryTests = discoverTests(KIT, ['tools', 'tests']);
    const steps = [
        { name: 'Генерация', required: true, run: async () => {
            const { prepareFrontend } = await import('../module.mjs');
            return { ok: await prepareFrontend({ root: KIT, settings: {} }) };
        } },
        { ...nodeStep('Типы', [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false']), suite: 'library' },
        { ...astStep('Архитектура', undefined, { fix }), suite: 'library' },
        { ...nodeStep('Границы', [script('check-boundary.mjs')]), suite: 'library' },
        { ...nodeStep('Стартовая тема', [script('check-tokens.mjs'), 'theme', '--strict']), suite: 'library' },
        { name: 'Тесты', suite: 'library', run: ({ failedOnly = false } = {}) => runNodeTests({
            cwd: KIT, files: libraryTests, stateFile: `${reportFile}.library-tests`, failedOnly,
            nodeArgs: ['--import', 'tsx', '--import', pathToFileURL(script('check/unit-runtime.mjs')).href,
                ...(process.env.CI ? ['--test-concurrency=2'] : [])],
        }) },
        { name: 'Браузер', suite: 'browser', run: ({ failedOnly = false } = {}) => runBrowserTests({ reportFile, failedOnly, shard }) },
    ];
    return steps.filter(step => step.required || suite === 'all' ||
        (suite === 'standard' ? step.suite === 'library' : step.suite === suite));
}

export function runUiChecks({ failedOnly, reportFile: requestedReport, ...options } = {}) {
    const suite = options.suite ?? 'standard';
    const reportFile = path.resolve(requestedReport ?? path.join(KIT, '.verification', `ui-${suite}.json`));
    return runSteps(uiCheckSteps({ ...options, reportFile }), {
        label: `Frontend (${suite})`, reportFile, failedOnly,
        profile: { suite, shard: options.shard, fix: Boolean(options.fix) },
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        if (args.includes('--report') && (!args[args.indexOf('--report') + 1] || args[args.indexOf('--report') + 1].startsWith('--'))) {
            throw new Error('--report requires a file path');
        }
        process.exitCode = (await runUiChecks({
            failedOnly: args.includes('--failed'),
            reportFile: args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined,
        })) ? 0 : 1;
    } catch (error) {
        console.error(
            `✗ UI — проверка не выполнена\n  ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
    }
}
