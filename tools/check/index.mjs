import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { check, projectRules } from './architecture.mjs';
import { runNode, runSteps } from './run.mjs';
import { runNodeTests } from './verify.mjs';

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.dirname(TOOLS);
const require = createRequire(import.meta.url);
const script = (name) => path.join(TOOLS, name);
const nodeStep = (name, args, cwd = KIT) => ({ name, run: () => runNode(args, cwd) });
const astStep = (name, ...args) => ({
    name,
    run: () => {
        const diagnostics = check(...args);
        return { ok: !diagnostics.some(item => item.severity !== 'warning'), diagnostics };
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
    { update = false, strict = false, fix = false, configFiles = [] } = {},
) {
    const configs = [
        ...new Set([
            ...readdirSync(root).filter((file) => /^(next|ui|delba)\.config\./.test(file)),
            ...configFiles,
        ]),
    ];
    return [
        nodeStep(
            'Правила проекта',
            [
                script('check-rules.mjs'),
                '--baseline',
                config.baseline ?? '.rules-baseline.json',
                ...(update ? ['--update'] : []),
                ...(fix ? ['--fix'] : []),
                ...(config.rules ?? ['src']),
            ],
            root,
        ),
        nodeStep(
            'Тема',
            [
                script('check-tokens.mjs'),
                ...(strict ? ['--strict'] : []),
                ...(config.themeDefaults ? ['--with-defaults'] : []),
                ...[config.theme ?? 'theme'].flat(),
                ...(config.motion
                    ? ['--generated-motion', path.join(KIT, 'src/core/_motion.scss')]
                    : []),
                ...(config.typography ? ['--typography', config.typography.join(',')] : []),
            ],
            root,
        ),
        nodeStep(
            'Импорты',
            [script('check-migration.mjs'), ...(config.rules ?? ['src']), ...configs],
            root,
        ),
        ...(config.componentAnatomy === false ? [] : [nodeStep('Анатомия D-компонентов', [
            script('check-d-component-anatomy.mjs'),
            ...(config.componentAnatomy === 'single-config' ? ['--single-config'] : []),
        ], root)]),
        astStep('Архитектура проекта', root, {
            rules: projectRules,
            dirs: config.rules ?? ['src'],
        }),
    ];
}

export function uiCheckSteps({
    project: requestedProject,
    config = {},
    configArg,
    fix = false,
    suite = 'standard',
    shard,
    typecheckCache,
    reportFile = path.join(requestedProject ?? KIT, '.verification', `ui-${suite}.json`),
} = {}) {
    if (config.testConcurrency !== undefined && (!Number.isInteger(config.testConcurrency) || config.testConcurrency < 1 || config.testConcurrency > 16)) {
        throw new Error('testConcurrency must be an integer from 1 to 16');
    }
    const testConcurrency = config.testConcurrency ?? (process.env.CI ? 2 : undefined);
    const project =
        requestedProject && path.relative(KIT, path.resolve(requestedProject)) !== ''
            ? requestedProject
            : undefined;
    if (!['standard', 'all', 'library', 'project', 'browser'].includes(suite))
        throw new Error(`Unknown UI suite: ${suite}`);
    if (typecheckCache !== undefined && (!project || suite !== 'project' || !typecheckCache)) {
        throw new Error('--typecheck-cache requires a consumer and --suite project');
    }
    if (fix && !['standard', 'all'].includes(suite))
        throw new Error('--fix requires --suite standard or all');
    if (shard !== undefined) {
        const match = /^(\d+)\/(\d+)$/.exec(shard);
        if (
            suite !== 'browser' ||
            !match ||
            Number(match[1]) < 1 ||
            Number(match[1]) > Number(match[2])
        ) {
            throw new Error('--shard requires --suite browser and a valid index/total');
        }
    }
    const discoverTests = (root, directories) => directories.flatMap(directory => {
        const source = path.join(root, directory);
        return existsSync(source) ? readdirSync(source, { recursive: true })
            .filter(file => /\.test\.(?:[cm]?[jt]s|tsx|jsx)$/.test(file))
            .map(file => path.join(directory, file)) : [];
    }).sort();
    const projectTests = project ? discoverTests(project, ['src', 'tests']) : [];
    const rootTests = discoverTests(KIT, ['tests']);
    const projectChecks = project
        ? projectSteps(project, config, {
              strict: true,
              fix,
              configFiles: configArg ? [configArg] : [],
          })
        : [];
    const steps = [
        ...(requestedProject
            ? [
                  {
                      ...nodeStep(
                          'Генерация',
                          [
                              script('cli.mjs'),
                              'build',
                              ...(configArg ? ['--config', configArg] : []),
                          ],
                          requestedProject,
                      ),
                      required: true,
                  },
              ]
            : []),
        ...(fix ? [astStep('Архитектура', undefined, { fix: true })] : []),
        ...(fix ? projectChecks.slice(0, 1) : []),
        {
            ...nodeStep('Типы', [
                require.resolve('typescript/bin/tsc'),
                '-p',
                'tsconfig.json',
                '--noEmit',
                '--incremental',
                'false',
            ]),
            suite: 'library',
        },
        ...(project
            ? [
                  {
                      ...nodeStep(
                          'Типы проекта',
                          [
                              require.resolve('typescript/bin/tsc'),
                              '--noEmit',
                              '--incremental',
                              typecheckCache ? 'true' : 'false',
                              ...(typecheckCache ? ['--tsBuildInfoFile', typecheckCache] : []),
                          ],
                          project,
                      ),
                      suite: 'project',
                  },
              ]
            : []),
        ...(!fix ? [{ ...astStep('Архитектура'), suite: 'library' }] : []),
        { ...nodeStep('Границы', [script('check-boundary.mjs')]), suite: 'library' },
        {
            ...nodeStep('Стартовая тема', [script('check-tokens.mjs'), 'theme', '--strict']),
            suite: 'library',
        },
        {
            name: 'Тесты',
            run: ({ failedOnly = false } = {}) => runNodeTests({
              cwd: KIT,
              files: ['tools/**/*.test.ts', 'tools/**/*.test.mjs', ...rootTests],
              stateFile: `${reportFile}.library-tests`,
              failedOnly,
              nodeArgs: [
                '--import',
                'tsx',
                '--import',
                pathToFileURL(script('check/unit-runtime.mjs')).href,
                ...(process.env.CI ? ['--test-concurrency=2'] : []),
              ],
            }),
            suite: 'library',
        },
        ...(projectTests.length
            ? [
                  {
                      name: 'Тесты проекта',
                      run: ({ failedOnly = false } = {}) => runNodeTests({
                          cwd: project,
                          files: projectTests,
                          stateFile: `${reportFile}.project-tests`,
                          failedOnly,
                          nodeArgs: [
                              ...(testConcurrency ? [`--test-concurrency=${testConcurrency}`] : []),
                              ...(config.testConditions ?? []).map(
                                  (condition) => `--conditions=${condition}`,
                              ),
                              '--import',
                              pathToFileURL(require.resolve('tsx')).href,
                          ],
                      }),
                      suite: 'project',
                  },
              ]
            : []),
        {
            name: 'Браузер',
            run: ({ failedOnly = false } = {}) => runBrowserTests({ reportFile, failedOnly, shard }),
            suite: 'browser',
        },
        ...(fix ? projectChecks.slice(1) : projectChecks).map((step) => ({
            ...step,
            suite: 'project',
        })),
    ];
    return steps.filter(
        (step) =>
            suite === 'all' ||
            step.required ||
            (suite === 'standard' ? step.suite !== 'browser' : step.suite === suite),
    );
}

export function runUiChecks(options = {}) {
    const suite = options.suite ?? 'standard';
    const reportFile = path.resolve(options.reportFile ?? path.join(options.project ?? KIT, '.verification', `ui-${suite}.json`));
    return runSteps(uiCheckSteps({ ...options, reportFile }), {
        label: suite === 'all' ? 'UI' : `UI (${suite})`,
        reportFile,
        failedOnly: options.failedOnly,
        concurrency: options.config?.checkConcurrency ?? 1,
        profile: { project: options.project, configArg: options.configArg, suite,
            shard: options.shard, fix: Boolean(options.fix), typecheckCache: options.typecheckCache },
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
