import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { formatStep } from './format.mjs';
import { startProgress } from './progress.mjs';

/** Node запускается без shell: одинаковые аргументы на Windows и Unix. */
export function runNode(args, cwd, { showOutput = false, environment } = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, ...environment, FORCE_COLOR: '0' };
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
      output: code === 0 ? (showOutput ? stripVTControlCharacters(output).trim() : '') : `${stripVTControlCharacters(output).trim()}\n${signal ? `Процесс остановлен: ${signal}.` : `Код завершения: ${code}.`}`.trim(),
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
  label = 'UI',
  reportFile,
  failedOnly = false,
  profile,
  concurrency = 1,
} = {}) {
  if (![1, 2].includes(concurrency)) throw new Error('checkConcurrency must be 1 or 2');
  const ids = steps.map((step, index) => step.id ?? (
    !reportFile && steps.filter((candidate) => candidate.name === step.name).length > 1
      ? `${index}:${step.name}` : step.name
  ));
  const identity = createHash('sha256').update(JSON.stringify({
    cwd: process.cwd(), label, profile,
    steps: steps.map((step, index) => ({ id: ids[index], required: Boolean(step.required), dependsOn: step.dependsOn ?? [] })),
  })).digest('hex');
  const file = reportFile ? path.resolve(reportFile) : null;
  const explicitDependencies = steps.some((step) => step.dependsOn !== undefined);
  const refuse = (message) => {
    write(formatStep(`${label} — ${message}`, { ok: false }, { color }));
    return false;
  };
  if (new Set(ids).size !== ids.length) return refuse('step ids must be unique');
  for (const [index, step] of steps.entries()) {
    if ((step.dependsOn ?? []).some((id) => !ids.slice(0, index).includes(id))) {
      return refuse(`dependencies must precede ${ids[index]}`);
    }
  }
  let previous;
  if (failedOnly) {
    try {
      previous = JSON.parse(fs.readFileSync(file ?? '', 'utf8'));
    } catch {
      return refuse('--failed requires a previous report');
    }
    if (previous.version !== 1 || previous.identity !== identity ||
        !Array.isArray(previous.steps) || previous.steps.length !== ids.length ||
        previous.steps.some((step, index) => step.id !== ids[index] || !['passed', 'failed', 'blocked'].includes(step.status))) {
      return refuse('--failed report does not match this profile');
    }
  }
  const selected = new Set(failedOnly
    ? previous.steps.filter((step) => step.status !== 'passed').map((step) => step.id)
    : ids);
  if (failedOnly && selected.size === 0) return refuse('no failures remain; run the final full profile');
  // Required preparation is repeated; explicit dependencies add only the needed ancestors.
  if (failedOnly) {
    if (!explicitDependencies) {
      const lastSelected = Math.max(...ids.map((id, index) => selected.has(id) ? index : -1));
      for (const [index, step] of steps.entries()) {
        if (step.required && index < lastSelected) selected.add(ids[index]);
      }
    }
    for (let index = steps.length - 1; index >= 0; index--) {
      if (selected.has(ids[index])) for (const id of steps[index].dependsOn ?? []) selected.add(id);
    }
  }
  const statuses = new Map((previous?.steps ?? []).map((step) => [step.id, step.status]));
  let ok = true;
  let stopped = false;
  const started = performance.now();
  async function execute(index) {
    const step = steps[index];
    const id = ids[index];
    if (!selected.has(id)) return;
    if (stopped || (step.dependsOn ?? []).some((dependency) => statuses.get(dependency) !== 'passed')) {
      statuses.set(id, 'blocked');
      ok = false;
      write(formatStep(`${step.name} — заблокировано подготовкой`, { ok: false }, { color }));
      return;
    }
    let result;
    const stepStarted = performance.now();
    const stopProgress = progress(step.name);
    try {
      result = await step.run({ failedOnly: failedOnly && previous.steps[index].status === 'failed' });
    } catch (error) {
      result = { ok: false, output: error instanceof Error ? error.message : String(error) };
    } finally {
      stopProgress();
    }
    const name = result.summary ? `${step.name} — тестов: ${result.summary.tests}` : step.name;
    write(formatStep(name, { ...result, durationMs: performance.now() - stepStarted }, { color }));
    ok = result.ok && ok;
    statuses.set(id, result.ok ? 'passed' : 'failed');
    if (result.signal || (!result.ok && step.required && !explicitDependencies)) stopped = true;
  }
  for (let index = 0; index < steps.length;) {
    const batch = [index++];
    if (!steps[batch[0]].required) {
      while (batch.length < concurrency && index < steps.length && !steps[index].required &&
        !(steps[index].dependsOn ?? []).some((id) => batch.some((pending) => ids[pending] === id))) {
        batch.push(index++);
      }
    }
    await Promise.all(batch.map(execute));
  }
  if (file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1, identity, scope: failedOnly ? 'failed' : 'full',
      complete: !failedOnly && ok, steps: steps.map((step, index) => ({ id: ids[index], name: step.name, status: statuses.get(ids[index]) })),
    }, null, 2) + '\n');
  }
  const summary = failedOnly
    ? (ok ? 'выбранные ошибки исправлены; требуется полный прогон' : 'повтор ошибок не пройден')
    : (ok ? 'все проверки прошли' : 'проверка не пройдена');
  write(`\n${formatStep(`${label} — ${summary}`, { ok, durationMs: performance.now() - started }, { color })}`);
  return ok;
}
