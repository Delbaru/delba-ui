import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { collapseRule } from './rules/collapse.mjs';
import { domRefRule } from './rules/dom-ref.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Правила кита; проекту достаются только общие — у него нет `src/components` кита и ядра. */
export const kitRules = [collapseRule, domRefRule];
export const projectRules = [domRefRule];

function sourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(file);
    return /\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

export function check(root = KIT, { rules = kitRules, dirs = ['src'] } = {}) {
  return dirs.flatMap((dir) => sourceFiles(path.resolve(root, dir))).sort().flatMap((file) => {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    return rules.flatMap((rule) => rule.check(source, { root }).map((item) => ({
      // Договор правила лежит в ките, а не в проекте, который его проверяет.
      ...item, file, rule: rule.id, docs: path.join(KIT, rule.docs),
    })));
  });
}
