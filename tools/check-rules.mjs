#!/usr/bin/env node
// Public controls retain their native focus/form and link semantics.
// Visual presentation, source formatting, responsive CSS, conditional rendering
// and the internal component anatomy are not product acceptance gates.
import fs from 'node:fs';
import path from 'node:path';

import { rawInputRule } from './check/rules/project-props.mjs';
import { jsxFormatRule } from './check/rules/jsx-format.mjs';

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'generated', 'public', 'UI']);

/** Behaviour-related boundary checks only. Source prettiness uses the opt-in formatter. */
export const RULES = {
  'raw-button': {
    ext: /\.tsx$/,
    test: line => /<button[\s>]/.test(line),
    hint: 'Примените публичную кнопку с единым pending/focus/action договором.',
  },
  'raw-input': {
    ext: /\.tsx$/,
    ast: rawInputRule,
    hint: 'Примените публичный контрол; системный file picker и согласованный range owner остаются допустимыми.',
  },
  'raw-anchor': {
    ext: /\.tsx$/,
    test: line => /<a[\s>]/.test(line),
    hint: 'Примените ссылочный контракт кита, сохранив native navigation и клавиатуру.',
  },
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  if (fs.statSync(dir).isFile()) {
    if (/\.(?:[cm]?[jt]sx?|scss)$/.test(dir) && !/\.(?:test|spec|typecheck|type-test|d)\.[cm]?[jt]sx?$/.test(dir))
      out.push(dir);
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(abs, out);
    } else if (
      /\.(?:[cm]?[jt]sx?|scss)$/.test(entry.name) &&
      !/\.(?:test|spec|typecheck|type-test|d)\.[cm]?[jt]sx?$/.test(entry.name)
    ) {
      out.push(abs);
    }
  }
  return out;
}

const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

export function countViolations(dirs) {
  const counts = {};
  const places = {};
  for (const rule of Object.keys(RULES)) {
    counts[rule] = {};
    places[rule] = {};
  }
  for (const file of dirs.flatMap((dir) => walk(path.resolve(dir)))) {
    const rel = path.relative(process.cwd(), file).split(path.sep).join('/');
    const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    const lines = text.split('\n');
    let offset = 0;
    const offsets = lines.map(line => { const start = offset; offset += line.length + 1; return start; });
    const client = lines.some((line) => /^\s*['"]use client['"]/.test(line));
    for (const [rule, def] of Object.entries(RULES)) {
      if (!def.ext.test(file) || (def.client && !client)) continue;
      if (def.ast) {
        const diagnostics = def.ast.count(fs.readFileSync(file, 'utf8'), file);
        if (diagnostics.length) {
          counts[rule][rel] = diagnostics.length;
          places[rule][rel] = diagnostics.map(({ line }) => line);
        }
        continue;
      }
      if (def.file) {
        const n = def.file(lines, file);
        if (n) {
          counts[rule][rel] = n;
          places[rule][rel] = [1];
        }
        continue;
      }
      lines.forEach((line, index) => {
        if (isComment(line)) return;
        const n = def.count ? def.count(line) : def.test(line, file, text, offsets[index]) ? 1 : 0;
        if (!n) return;
        counts[rule][rel] = (counts[rule][rel] ?? 0) + n;
        (places[rule][rel] ??= []).push(index + 1);
      });
    }
  }
  return { counts, places };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('tools', 'check-rules.mjs'));

if (isMain) {
  const args = process.argv.slice(2);
  const baselineFile = args[args.indexOf('--baseline') + 1];
  const update = args.includes('--update');
  const fix = args.includes('--fix');
  const dirs = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--baseline');
  if (!baselineFile || !dirs.length) {
    console.error('Usage: node check-rules.mjs --baseline <file.json> [--update] [--fix] <dirs…>');
    process.exit(1);
  }

  if (fix) {
    for (const file of dirs.flatMap((dir) => walk(path.resolve(dir)))) {
      if (!/\.tsx$/.test(file)) continue;
      const before = fs.readFileSync(file, 'utf8');
      const after = jsxFormatRule.fix(before, file);
      if (after !== before) fs.writeFileSync(file, after);
    }
  }

  const { counts, places } = countViolations(dirs);
  const total = (rule, data) => Object.values(data[rule] ?? {}).reduce((a, b) => a + b, 0);

  if (update || !fs.existsSync(baselineFile)) {
    const strict = Object.entries(RULES).filter(([rule, definition]) => definition.baseline === false && total(rule, counts) > 0);
    if (strict.length) {
      console.error(`[ui:rules] ✗ правила без планки требуют нулевых нарушений: ${strict.map(([rule]) => `${rule} ${total(rule, counts)}`).join(', ')}`);
      process.exit(1);
    }
    const stored = Object.fromEntries(Object.keys(RULES).map(rule => [rule, RULES[rule].baseline === false ? {} : counts[rule]]));
    fs.writeFileSync(baselineFile, `${JSON.stringify(stored, null, 2)}\n`);
    const summary = Object.keys(RULES)
      .map((rule) => `${rule} ${total(rule, counts)}`)
      .join(', ');
    console.log(`[ui:rules] планка записана: ${summary}`);
    process.exit(0);
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  // Правило, которого нет в планке, пришло с обновлением кита: старые места проекта — его долг, а не
  // поломка. Правила с baseline:false всегда требуют нуля и не принимают этот долг.
  const fresh = Object.keys(RULES).filter((rule) => !(rule in baseline) && RULES[rule].baseline !== false);
  if (fresh.length) {
    for (const rule of fresh) baseline[rule] = counts[rule];
    fs.writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(
      `[ui:rules] новые правила в планке: ${fresh.map((rule) => `${rule} ${total(rule, counts)}`).join(', ')}`,
    );
  }
  let grew = 0;
  for (const [rule, def] of Object.entries(RULES)) {
    for (const [file, n] of Object.entries(counts[rule])) {
      const allowed = def.baseline === false ? 0 : baseline[rule]?.[file] ?? 0;
      if (n > allowed) {
        grew += n - allowed;
        console.error(
          `[ui:rules] ✗ ${rule}: ${file} — было ${allowed}, стало ${n} (строки ${places[rule][file].join(', ')}) → ${def.hint}`,
        );
      }
    }
  }
  const lowered = Object.keys(RULES).filter((rule) => total(rule, counts) < total(rule, baseline));
  const summary = Object.keys(RULES)
    .map((rule) => `${rule} ${total(rule, counts)}`)
    .join(', ');
  if (grew) {
    console.error(`[ui:rules] ✗ новых нарушений красных линий: ${grew}`);
    process.exit(1);
  }
  console.log(
    `[ui:rules] ✓ новых нарушений нет (${summary})` +
      (lowered.length ? `; планку можно опустить: ${lowered.join(', ')} → --update` : ''),
  );
}
