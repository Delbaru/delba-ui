import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

import { formatStep } from './format.mjs';
import { startProgress } from './progress.mjs';

/** Node запускается без shell: одинаковые аргументы на Windows и Unix. */
export function runNode(args, cwd) {
  return new Promise((resolve) => {
    const env = { ...process.env, FORCE_COLOR: '0' };
    // Playwright assigns FORCE_COLOR to its workers; an inherited NO_COLOR makes Node warn.
    delete env.NO_COLOR;
    // Иначе Node пропускает отдельный test runner, запущенный из теста самого инструмента.
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    let output = '';
    let warnings = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => {
      output += chunk;
      warnings += chunk;
    });
    child.on('error', (error) => resolve({ ok: false, output: error.message }));
    child.on('close', (code, signal) => resolve({
      ok: code === 0,
      output: code === 0 ? '' : `${stripVTControlCharacters(output).trim()}\n${signal ? `Процесс остановлен: ${signal}.` : `Код завершения: ${code}.`}`.trim(),
      warnings: code === 0 ? stripVTControlCharacters(warnings).trim() : '',
      signal,
    }));
  });
}

/** Независимые проверки продолжаются после ошибки; обязательная подготовка останавливает запуск. */
export async function runSteps(steps, {
  write = console.log,
  color = Boolean(process.stdout.isTTY) && !('NO_COLOR' in process.env) && process.env.FORCE_COLOR !== '0',
  progress = (name) => startProgress(name, { color }),
} = {}) {
  let ok = true;
  const started = performance.now();
  for (const step of steps) {
    let result;
    const stepStarted = performance.now();
    const stopProgress = progress(step.name);
    try {
      result = await step.run();
    } catch (error) {
      result = { ok: false, output: error instanceof Error ? error.message : String(error) };
    } finally {
      stopProgress();
    }
    write(formatStep(step.name, { ...result, durationMs: performance.now() - stepStarted }, { color }));
    ok = result.ok && ok;
    if (result.signal || (!result.ok && step.required)) break;
  }
  write(`\n${formatStep(ok ? 'UI — все проверки прошли' : 'UI — проверка не пройдена', { ok, durationMs: performance.now() - started }, { color })}`);
  return ok;
}
