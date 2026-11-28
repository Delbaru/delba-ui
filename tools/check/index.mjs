import { readdirSync } from 'node:fs';
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
                path.join(KIT, 'src/core/theme.css'),
                ...(config.motion
                    ? ['--generated-motion', path.join(KIT, 'src/core/_motion.scss')]
                    : []),
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
    fix = false, ...unsupported } = {}) {
    for (const key of Object.keys(unsupported)) {
        if (unsupported[key] !== undefined) throw new Error(`Unsupported Frontend verification option: ${key}`);
    }
    if (!['standard', 'all', 'library'].includes(suite)) throw new Error(`Unknown UI suite: ${suite}`);
    const libraryTests = discoverTests(KIT);
    return [
        { name: 'Генерация', required: true, run: async () => {
            const { prepareFrontend } = await import('../module.mjs');
            const { registerFrontendSources } = await import('../registration.mjs');
            await registerFrontendSources();
            const { starterFrontend } = await import('../visual/starter.ts');
            return { ok: await prepareFrontend({ root: KIT, settings: starterFrontend }) };
        } },
        nodeStep('Типы', [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false']),
        astStep('Архитектура', undefined, { fix }),
        nodeStep('Границы', [script('check-boundary.mjs')]),
        nodeStep('Стартовая тема', [script('check-tokens.mjs'), path.join(KIT, 'src/core/theme.css'), '--strict']),
        { name: 'Тесты', run: ({ failedOnly = false } = {}) => runNodeTests({
            cwd: KIT, files: libraryTests, stateFile: `${reportFile}.library-tests`, failedOnly,
            nodeArgs: ['--import', 'tsx', '--import', pathToFileURL(script('check/unit-runtime.mjs')).href,
                ...(process.env.CI ? ['--test-concurrency=2'] : [])],
        }) },
    ];
}

export function runUiChecks({ failedOnly, reportFile: requestedReport, ...options } = {}) {
    const suite = options.suite ?? 'standard';
    const reportFile = path.resolve(requestedReport ?? path.join(KIT, '.verification', `ui-${suite}.json`));
    return runSteps(uiCheckSteps({ ...options, reportFile }), {
        label: `Frontend (${suite})`, reportFile, failedOnly,
        profile: { suite, fix: Boolean(options.fix) },
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
