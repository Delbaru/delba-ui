import path from 'node:path';
import { pathToFileURL } from 'node:url';

const paint = (code, text, color) => color ? `\u001b[${code}m${text}\u001b[0m` : text;

/** Текущий шаг: спокойный голубой индикатор и короткое имя. */
export function formatProgress(name, frame, { color = false } = {}) {
  return `${paint(36, frame, color)} ${name}…`;
}

/** Успех — одна строка; подробности появляются при ошибке или предупреждении. */
export function formatStep(name, { ok, output = '', warnings = '', diagnostics = [] }, { color = false } = {}) {
  if (diagnostics.length) return formatCheck(name, diagnostics, { color });
  const code = !ok ? 31 : warnings ? 33 : 32;
  const symbol = !ok ? '✗' : warnings ? '⚠' : '✓';
  const mark = paint(code, symbol, color);
  const details = (!ok ? output : warnings).trim();
  return `${mark} ${name}${details ? `\n${details.split('\n').map((line) => `  ${line}`).join('\n')}` : ''}`;
}

/** Оформление общее; правила возвращают данные и ничего не печатают. */
export function formatCheck(name, diagnostics, { cwd = process.cwd(), color = false } = {}) {
  if (!diagnostics.length) return `${paint(32, '✓', color)} ${name} — все проверки прошли`;
  const lines = [`${paint(31, '✗', color)} ${name} — ошибок: ${diagnostics.length}`];
  for (const item of diagnostics) {
    lines.push('', `  ${path.relative(cwd, item.file).split(path.sep).join('/')}:${item.line}:${item.column}`);
    lines.push(`  ${item.message}`, `  ${item.fix}`);
    if (item.docs) lines.push(`  ${paint(2, `Правило: ${pathToFileURL(item.docs).href}`, color)}`);
  }
  return lines.join('\n');
}
