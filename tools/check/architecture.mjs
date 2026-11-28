import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { checkImportBoundaries, checkTestPlacement, fileLengthRule, jsxCompositionRule, responsiveTupleRule } from '@delba/eslint';
import { checkComponentScaffolds, componentAnatomyRule } from './rules/component-anatomy.mjs';
import { collapseRule } from './rules/collapse.mjs';
import { domRefRule } from './rules/dom-ref.mjs';
import { jsxFormatRule } from './rules/jsx-format.mjs';
import { responsiveHideRule } from './rules/responsive-hide.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The shared package owns import, RPX, composition and file-length architecture rules. */
export const kitRules = [
  collapseRule, domRefRule, jsxFormatRule, jsxCompositionRule,
  componentAnatomyRule, responsiveHideRule, fileLengthRule,
];
export const projectRules = [
  domRefRule, responsiveHideRule, jsxCompositionRule, responsiveTupleRule, fileLengthRule,
];

function sourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(file);
    return /\.tsx?$/.test(entry.name) && !/\.(test|typecheck|type-test|d)\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

function typeProgram(root) {
  const config = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!config) return undefined;
  const read = ts.readConfigFile(config, ts.sys.readFile);
  if (read.error) return undefined;
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(config));
  if (parsed.errors.length) return undefined;
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
}

export function check(root = KIT, {
  rules = kitRules, dirs = ['src'], fix = false,
  includeBoundaries = root === KIT, mode = root === KIT ? 'ui' : 'consumer',
} = {}) {
  const files = dirs.flatMap((dir) => sourceFiles(path.resolve(root, dir))).sort();
  if (fix) {
    for (const file of files) {
      const before = fs.readFileSync(file, 'utf8');
      let text = before;
      if (file.endsWith('.tsx')) {
        for (const rule of rules) if (typeof rule.fix === 'function') text = rule.fix(text, file);
      }
      if (text !== before) fs.writeFileSync(file, text);
    }
  }
  const program = typeProgram(root);
  const checker = program?.getTypeChecker();
  const diagnostics = files.flatMap((file) => {
    const source = program?.getSourceFile(path.resolve(file)) ??
      ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    return rules.flatMap((rule) => rule.check(source, { root, checker }).map((item) => ({
      ...item, file, rule: rule.id, docs: path.join(KIT, rule.docs),
    })));
  });
  if (root === KIT && rules.includes(componentAnatomyRule)) diagnostics.push(...checkComponentScaffolds(root));
  if (includeBoundaries) {
    diagnostics.push(...checkImportBoundaries(root, { dirs, mode }));
    diagnostics.push(...checkTestPlacement(root).map((file) => ({
      file: path.resolve(root, file), line: 1, column: 1, rule: 'test-placement',
      severity: 'error', message: `Test files belong in root tests/: ${file}`,
    })));
  }
  return diagnostics;
}
