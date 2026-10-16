import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { check, projectRules } from './architecture.mjs';
import { runNode, runSteps } from './run.mjs';

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.dirname(TOOLS);
const require = createRequire(import.meta.url);
const script = (name) => path.join(TOOLS, name);
const nodeStep = (name, args, cwd = KIT) => ({ name, run: () => runNode(args, cwd) });
const astStep = (name, ...args) => ({
  name,
  run: () => {
    const diagnostics = check(...args);
    return { ok: diagnostics.length === 0, diagnostics };
  },
});

/** Один список шагов для быстрой проверки проекта и полной проверки UI. */
export function projectSteps(root, config, { update = false, strict = false, fix = false } = {}) {
  const configs = readdirSync(root).filter((file) => /^(next|ui).config./.test(file));
  return [
    nodeStep('Правила проекта', [script('check-rules.mjs'), '--baseline', config.baseline ?? '.rules-baseline.json', ...(update ? ['--update'] : []), ...(fix ? ['--fix'] : []), ...(config.rules ?? ['src'])], root),
    nodeStep('Тема', [script('check-tokens.mjs'), ...(strict ? ['--strict'] : []), ...[config.theme ?? 'theme'].flat(), ...(config.motion ? ['--generated-motion', path.join(KIT, 'src/core/_motion.scss')] : []), ...(config.typography ? ['--typography', config.typography.join(',')] : [])], root),
    nodeStep('Импорты', [script('check-migration.mjs'), ...(config.rules ?? ['src']), ...configs], root),
    astStep('Архитектура проекта', root, { rules: projectRules, dirs: config.rules ?? ['src'] }),
  ];
}

export function uiCheckSteps({ project, config = {}, configArg = 'ui.config.ts', fix = false, suite = 'all', shard } = {}) {
  if (!['all', 'library', 'project', 'browser'].includes(suite)) throw new Error(`Unknown UI suite: ${suite}`);
  if (fix && suite !== 'all') throw new Error('--fix requires the complete UI suite');
  if (shard !== undefined) {
    const match = /^(\d+)\/(\d+)$/.exec(shard);
    if (suite !== 'browser' || !match || Number(match[1]) < 1 || Number(match[1]) > Number(match[2])) {
      throw new Error('--shard requires --suite browser and a valid index/total');
    }
  }
  const source = project ? path.join(project, 'src') : undefined;
  const projectTests = source && existsSync(source)
    ? readdirSync(source, { recursive: true })
      .filter((file) => /\.test\.(?:[cm]?[jt]s|tsx|jsx)$/.test(file))
      .map((file) => path.join('src', file)).sort()
    : [];
  const projectChecks = project ? projectSteps(project, config, { strict: true, fix }) : [];
  const steps = [
    ...(project ? [{ ...nodeStep('Генерация', [script('cli.mjs'), 'build', '--config', configArg], project), required: true }] : []),
    ...(fix ? [astStep('Архитектура', undefined, { fix: true })] : []),
    ...(fix ? projectChecks.slice(0, 1) : []),
    { ...nodeStep('Типы', [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false']), suite: 'library' },
    ...(project ? [{ ...nodeStep('Типы проекта', [require.resolve('typescript/bin/tsc'), '--noEmit', '--incremental', 'false'], project), suite: 'project' }] : []),
    ...(!fix ? [{ ...astStep('Архитектура'), suite: 'library' }] : []),
    { ...nodeStep('Границы', [script('check-boundary.mjs')]), suite: 'library' },
    { ...nodeStep('Стартовая тема', [script('check-tokens.mjs'), 'theme', '--strict']), suite: 'library' },
    { ...nodeStep('Тесты', ['--import', 'tsx', '--test', ...(process.env.CI ? ['--test-concurrency=2'] : []), '--test-reporter', pathToFileURL(script('check/reporter.mjs')).href, 'src/**/*.test.ts', 'tools/**/*.test.ts']), suite: 'library' },
    ...(projectTests.length ? [{ ...nodeStep('Тесты проекта', ['--import', pathToFileURL(require.resolve('tsx')).href, '--test', '--test-reporter', pathToFileURL(script('check/reporter.mjs')).href, ...projectTests], project), suite: 'project' }] : []),
    { ...nodeStep('Браузер', [require.resolve('@playwright/test/cli'), 'test', '--config', 'tools/browser/playwright.config.ts', ...(shard ? ['--shard', shard] : [])]), suite: 'browser' },
    ...(fix ? projectChecks.slice(1) : projectChecks).map((step) => ({ ...step, suite: 'project' })),
  ];
  return steps.filter((step) => suite === 'all' || step.required || step.suite === suite);
}

export function runUiChecks(options = {}) {
  const suite = options.suite ?? 'all';
  return runSteps(uiCheckSteps(options), { label: suite === 'all' ? 'UI' : `UI (${suite})` });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runUiChecks() ? 0 : 1;
  } catch (error) {
    console.error(`✗ UI — проверка не выполнена\n  ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
