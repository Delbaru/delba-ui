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
export function projectSteps(root, config, { update = false, strict = false } = {}) {
  const configs = readdirSync(root).filter((file) => /^(next|ui).config./.test(file));
  return [
    nodeStep('Правила проекта', [script('check-rules.mjs'), '--baseline', config.baseline ?? '.rules-baseline.json', ...(update ? ['--update'] : []), ...(config.rules ?? ['src'])], root),
    nodeStep('Тема', [script('check-tokens.mjs'), ...(strict ? ['--strict'] : []), ...[config.theme ?? 'theme'].flat(), ...(config.motion ? ['--generated-motion', path.join(KIT, 'src/core/_motion.scss')] : []), ...(config.typography ? ['--typography', config.typography.join(',')] : [])], root),
    nodeStep('Импорты', [script('check-migration.mjs'), ...(config.rules ?? ['src']), ...configs], root),
    astStep('Архитектура проекта', root, { rules: projectRules, dirs: config.rules ?? ['src'] }),
  ];
}

export function runUiChecks({ project, config = {}, configArg = 'ui.config.ts' } = {}) {
  const source = project ? path.join(project, 'src') : undefined;
  const projectTests = source && existsSync(source)
    ? readdirSync(source, { recursive: true })
      .filter((file) => /\.test\.(?:[cm]?[jt]s|tsx|jsx)$/.test(file))
      .map((file) => path.join('src', file)).sort()
    : [];
  const steps = [
    ...(project ? [{ ...nodeStep('Генерация', [script('cli.mjs'), 'build', '--config', configArg], project), required: true }] : []),
    nodeStep('Типы', [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false']),
    ...(project ? [nodeStep('Типы проекта', [require.resolve('typescript/bin/tsc'), '--noEmit', '--incremental', 'false'], project)] : []),
    astStep('Архитектура'),
    nodeStep('Границы', [script('check-boundary.mjs')]),
    nodeStep('Стартовая тема', [script('check-tokens.mjs'), 'theme', '--strict']),
    nodeStep('Тесты', ['--import', 'tsx', '--test', '--test-reporter', pathToFileURL(script('check/reporter.mjs')).href, 'src/**/*.test.ts', 'tools/**/*.test.ts']),
    ...(projectTests.length ? [nodeStep('Тесты проекта', ['--import', pathToFileURL(require.resolve('tsx')).href, '--test', '--test-reporter', pathToFileURL(script('check/reporter.mjs')).href, ...projectTests], project)] : []),
    nodeStep('Браузер', [require.resolve('@playwright/test/cli'), 'test', '--config', 'tools/browser/playwright.config.ts']),
    ...(project ? projectSteps(project, config, { strict: true }) : []),
  ];
  return runSteps(steps);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runUiChecks() ? 0 : 1;
  } catch (error) {
    console.error(`✗ UI — проверка не выполнена\n  ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
