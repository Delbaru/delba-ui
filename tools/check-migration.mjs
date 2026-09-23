#!/usr/bin/env node
// Подсказки перехода на кит 2.0 (пакет `@delba/ui`): находит в коде проекта пути внутрь кита,
// SCSS по старым именам и `<Container/>` — то, что после обновления падает непонятной ошибкой сборки.
//
//   node <кит>/tools/check-migration.mjs <папки проекта…>    → код 1 и список с заменами
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'public', 'UI', 'delba-ui']);
const DOC = 'README кита, «Переход на 2.0»';
// Папка сабмодуля у проектов зовётся по-разному: `UI` (socrat, D4Y) или `delba-ui`.
const DEEP = /(^|\/)(UI|delba-ui)(\/|$)|^@delba\/ui\/(?!(skin|next|config|icons\/.+)$)/;
const KIT_MODULE = /^@delba\/ui$|(^|\/)(UI|delba-ui)(\/|$)|\/ui\/container$/i;
const SCSS_SHORT = /^(mixins|scss-utils|UI\/core\/.+)$/;
const SCSS_ENTRY = /^@delba\/ui\/(mixins|styles|theme|skin-classes|skin-states)$/;

const RULES = [
  [/@(?:use|forward|import)\s+['"]([^'"]+)['"]/g, (spec) => !SCSS_ENTRY.test(spec) && (DEEP.test(spec) || SCSS_SHORT.test(spec)) && `SCSS кита — по имени: '@delba/ui/mixins' | '@delba/ui/styles' | '@delba/ui/skin-classes' | '@delba/ui/skin-states' (было '${spec}')`],
  [/(?:from\s*|import\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm, (spec) => DEEP.test(spec) && !/\.s?css$/.test(spec) && `импорт внутрь кита '${spec}' → '@delba/ui' (или '@delba/ui/skin', '/next', '/config')`],
  [/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g, (names, spec) => KIT_MODULE.test(spec) && /\bContainer\b/.test(names) && '<Container/> удалён → <Box container> (или Flex/Grid container); вертикальные поля — у секции'],
];

function walk(target, out = []) {
  if (!fs.existsSync(target)) return out;
  if (fs.statSync(target).isFile()) return /\.(tsx?|m?js|scss)$/.test(target) ? [...out, target] : out;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(target, entry.name), out);
    } else if (/\.(tsx?|m?js|scss)$/.test(entry.name)) out.push(path.join(target, entry.name));
  }
  return out;
}

/** Места старого подключения кита в папках проекта: `файл:строка — что сделать`. */
export function findLegacy(targets) {
  const found = [];
  for (const file of targets.flatMap((target) => walk(path.resolve(target)))) {
    const code = fs.readFileSync(file, 'utf8');
    for (const [re, message] of RULES) {
      for (const match of code.matchAll(re)) {
        const text = message(...match.slice(1).filter((group) => group !== undefined), match[0]);
        if (!text) continue;
        const line = code.slice(0, match.index).split('\n').length;
        found.push(`${path.relative(process.cwd(), file)}:${line} — ${text}`);
      }
    }
  }
  return found;
}

/** Печатает находки; true — чисто. */
export function reportLegacy(targets) {
  const found = findLegacy(targets);
  if (!found.length) return true;
  console.error(`[ui:migrate] ✗ старое подключение кита (${found.length}), как перейти — ${DOC}:`);
  for (const line of found) console.error(`  ${line}`);
  return false;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ok = reportLegacy(process.argv.slice(2));
  if (ok) console.log('[ui:migrate] ✓ старых путей к киту нет');
  process.exit(ok ? 0 : 1);
}
