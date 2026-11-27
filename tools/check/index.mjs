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
const nodeStep = (name, args, cwd = KIT) => ({ name, run: () => runNode(args, cwd) });
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
    { update = false, strict = false, fix = false, configFiles = [] } = {},
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
                '--baseline',
                '.rules-baseline.json',
                ...(update ? ['--update'] : []),
                ...(fix ? ['--fix'] : []),
                'src',
            ],
            root,
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
        ),
        nodeStep(
            'Импорты',
            [script('check-migration.mjs'), 'src', ...configs],
            root,
        ),
        nodeStep(
            'Анатомия D-компонентов',
            [script('check-d-component-anatomy.mjs'), '--single-config'],
            root,
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

function projectTestOwner(project) {
    if (!project) return undefined;
    const manifest = path.join(project, 'package.json');
    if (!existsSync(manifest)) return undefined;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    // The CRM owns the root selection and native guard. Use its existing CLI,
    // not a copy of the guard or a second discovery pass over its sources.
    return pkg.name === 'delba-os' ? 'crm' : undefined;
}

function crmTestEnvironment() {
    if (process.env.CRM_QA_DB_TESTS !== '1') return { CRM_QA_DB_TESTS: '0' };
    return {
        CRM_QA_DB_TESTS: '1',
        CRM_QA_DATABASE: process.env.CRM_QA_DATABASE?.trim() ?? '',
        DATABASE_URL: process.env.DATABASE_URL ?? '',
    };
}

async function crmTestPlan(project, environment) {
    const result = await runNode(['tools/verification/run.mjs', 'root', '--plan'],
        project, { showOutput: true, environment });
    if (!result.ok) return result;
    try {
        const plan = JSON.parse(result.output);
        if (!plan || typeof plan !== 'object' || Array.isArray(plan) ||
            !Array.isArray(plan.files) || !plan.files.length ||
            plan.files.some(file => typeof file !== 'string' || !file.trim()) ||
            !Array.isArray(plan.nodeArgs) ||
            plan.nodeArgs.some(argument => typeof argument !== 'string' || !argument.trim())) {
            throw new Error('Expected CRM root files and Node arguments.');
        }
        return { ok: true, files: plan.files, nodeArgs: plan.nodeArgs };
    } catch {
        return { ok: false, output: 'Invalid CRM root test plan.' };
    }
}

function concurrencyOption(value, environment, fallback, maximum, name) {
    const selected = value ?? (process.env[environment] === undefined ? fallback : Number(process.env[environment]));
    if (selected !== undefined && (!Number.isInteger(selected) || selected < 1 || selected > maximum))
        throw new Error(`${name} must be an integer from 1 to ${maximum}`);
    return selected;
}

export function uiCheckSteps({
    project: requestedProject,
    config = {},
    configArg,
    testConcurrency: requestedTestConcurrency,
    testConditions,
    checkConcurrency,
    fix = false,
    suite = 'standard',
    shard,
    typecheckCache,
    reportFile = path.join(requestedProject ?? KIT, '.verification', `ui-${suite}.json`),
} = {}) {
    const testConcurrency = concurrencyOption(requestedTestConcurrency, 'DELBA_TEST_CONCURRENCY',
        process.env.CI ? 2 : undefined, 16, 'testConcurrency');
    concurrencyOption(checkConcurrency, 'DELBA_CHECK_CONCURRENCY', 1, 2, 'checkConcurrency');
    if (testConditions !== undefined && (!Array.isArray(testConditions) ||
        testConditions.some(condition => typeof condition !== 'string' || !condition.trim())))
        throw new Error('testConditions must be an array of nonempty strings');
    const project =
        requestedProject && path.relative(KIT, path.resolve(requestedProject)) !== ''
            ? requestedProject
            : undefined;
    const crm = projectTestOwner(project) === 'crm';
    const environment = crm ? crmTestEnvironment() : undefined;
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
    const projectTests = project && !crm ? discoverTests(project, ['src', 'tests']) : [];
    const expectsProjectTests = project && (crm || projectTests.length > 0 ||
        requestedTestConcurrency !== undefined || process.env.DELBA_TEST_CONCURRENCY !== undefined || testConditions !== undefined);
    let crmPlan;
    const planCrm = async () => {
        crmPlan = await crmTestPlan(project, environment);
        return crmPlan;
    };
    const libraryTests = discoverTests(KIT, ['tools', 'tests']);
    const projectChecks = project
        ? projectSteps(project, config, {
              strict: true,
              fix,
              configFiles: configArg ? [configArg] : [],
          })
        : [];
    const steps = [
        ...(crm && ['standard', 'all', 'project'].includes(suite)
            ? [{ name: 'План тестов CRM', required: true, suite: 'project', run: planCrm }]
            : []),
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
              files: libraryTests,
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
        ...(expectsProjectTests
            ? [
                  {
                      name: 'Тесты проекта',
                      run: async ({ failedOnly = false } = {}) => {
                          const plan = crm ? (crmPlan ?? await planCrm()) :
                              {
                                  ok: true,
                                  files: projectTests,
                                  nodeArgs: [
                                      ...(testConcurrency ? [`--test-concurrency=${testConcurrency}`] : []),
                                      '--import',
                                      pathToFileURL(require.resolve('tsx')).href,
                                  ],
                              };
                          crmPlan = undefined;
                          if (!plan.ok) return plan;
                          return runNodeTests({
                              cwd: project,
                              files: plan.files,
                              stateFile: `${reportFile}.project-tests`,
                              failedOnly,
                              environment,
                              nodeArgs: [
                                  ...plan.nodeArgs,
                                  ...(testConditions ?? []).map(
                                      (condition) => `--conditions=${condition}`,
                                  ),
                              ],
                          });
                      },
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
        concurrency: concurrencyOption(options.checkConcurrency, 'DELBA_CHECK_CONCURRENCY', 1, 2, 'checkConcurrency'),
        profile: { project: options.project, configArg: options.configArg, suite,
            shard: options.shard, fix: Boolean(options.fix), typecheckCache: options.typecheckCache,
            testConcurrency: concurrencyOption(options.testConcurrency, 'DELBA_TEST_CONCURRENCY', process.env.CI ? 2 : undefined, 16, 'testConcurrency'),
            testConditions: options.testConditions,
            checkConcurrency: concurrencyOption(options.checkConcurrency, 'DELBA_CHECK_CONCURRENCY', 1, 2, 'checkConcurrency'),
            crmEnvironment: projectTestOwner(options.project) === 'crm'
                ? createHash('sha256').update(JSON.stringify(crmTestEnvironment())).digest('hex') : undefined },
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
