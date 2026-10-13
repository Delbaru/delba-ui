import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { position } from './ast.mjs';

const docs = 'docs/authoring.md';
const fixHint = 'Запустите `npm run ui:test -- --fix`.';
const configCache = new Map();

function configFor(fileName, options = {}) {
  if (Number.isFinite(options.printWidth) || Number.isFinite(options.tabWidth)) {
    return { printWidth: options.printWidth ?? 100, tabWidth: options.tabWidth ?? 4 };
  }
  let dir = path.dirname(path.resolve(fileName));
  while (true) {
    if (configCache.has(dir)) return configCache.get(dir);
    const candidate = ['.prettierrc', '.prettierrc.json'].map((name) => path.join(dir, name)).find(fs.existsSync);
    if (candidate) {
      try {
        const config = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        const result = { printWidth: config.printWidth ?? 100, tabWidth: config.tabWidth ?? 4 };
        configCache.set(dir, result);
        return result;
      } catch { return { printWidth: 100, tabWidth: 4 }; }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return { printWidth: 100, tabWidth: 4 };
    dir = parent;
  }
}

function lineIndent(source, pos) {
  const lineStart = source.text.lastIndexOf('\n', pos - 1) + 1;
  return source.text.slice(lineStart, pos).match(/^\s*/)?.[0] ?? '';
}

function linePrefix(source, pos) {
  const lineStart = source.text.lastIndexOf('\n', pos - 1) + 1;
  return source.text.slice(lineStart, pos);
}

function hasComments(source, node) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source.text);
  scanner.setTextPos(node.getStart(source));
  while (scanner.getTextPos() < node.end) {
    const token = scanner.scan();
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) return true;
  }
  return false;
}

function openingText(source, node, printWidth, tabWidth) {
  const attrs = node.attributes.properties;
  const attrTexts = attrs.map((attribute) => attribute.getText(source));
  // Preserve multiline object values and nested templates for the native parser/printer.
  if (attrTexts.some((text) => /[\r\n]/.test(text))) return undefined;
  const tag = node.tagName.getText(source);
  const typeArguments = node.typeArguments?.length
    ? `<${node.typeArguments.map((argument) => argument.getText(source)).join(', ')}>`
    : '';
  const terminator = ts.isJsxSelfClosingElement(node) ? ' />' : '>';
  const compact = `<${tag}${typeArguments}${attrs.length ? ` ${attrTexts.join(' ')}` : ''}${terminator}`;
  const indent = lineIndent(source, node.getStart(source));
  if (linePrefix(source, node.getStart(source)).length + compact.length <= printWidth) return compact;
  if (!attrs.length) return compact;
  const newline = source.text.includes('\r\n') ? '\r\n' : '\n';
  const attrIndent = `${indent}${' '.repeat(tabWidth)}`;
  return `<${tag}${typeArguments}${newline}${attrIndent}${attrTexts.join(`${newline}${attrIndent}`)}${newline}${indent}${ts.isJsxSelfClosingElement(node) ? '/>' : '>'}`;
}

function safeInlineChild(source, element, printWidth) {
  if (!ts.isJsxElement(element) || !element.closingElement) return undefined;
  const children = element.children;
  if (children.some((child) => ts.isJsxText(child) && !child.text.trim() && !/[\r\n]/.test(child.text))) return undefined;
  const substantive = children.filter((child) => !(ts.isJsxText(child) && !child.text.trim()));
  if (substantive.length !== 1 || children.some((child) => ts.isJsxText(child) && child.text.trim())) return undefined;
  const child = substantive[0];
  if (!ts.isJsxExpression(child) || !child.expression || hasComments(source, child)) return undefined;
  const expression = child.expression;
  if (!(ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression))) return undefined;
  const inner = `{${expression.getText(source)}}`;
  const opening = element.openingElement.getText(source);
  const closing = element.closingElement.getText(source);
  const prefix = linePrefix(source, element.getStart(source));
  if (prefix.length + opening.length + inner.length + closing.length > printWidth) return undefined;
  return { start: element.openingElement.end, end: element.closingElement.getStart(source), text: inner };
}

function formatting(source, options = {}) {
  if (/\.(?:typecheck|type-test)\.tsx$/.test(source.fileName)) return { diagnostics: [], edits: [] };
  const { printWidth, tabWidth } = configFor(source.fileName, options);
  const diagnostics = [];
  const edits = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (!hasComments(source, node)) {
        const expected = openingText(source, node, printWidth, tabWidth);
        if (expected !== undefined && node.getText(source) !== expected) {
          diagnostics.push({ ...position(source, node), message: 'Короткий JSX-тег оставляйте в строке; длинный тег переносите по одному пропу на строку.', fix: fixHint });
          edits.push({ start: node.getStart(source), end: node.end, text: expected });
        }
      }
    }
    if (ts.isJsxElement(node)) {
      const child = safeInlineChild(source, node, printWidth);
      if (child && source.text.slice(child.start, child.end) !== child.text) {
        diagnostics.push({ ...position(source, node), message: 'Короткое JSX-содержимое оставляйте в строке с тегами.', fix: fixHint });
        edits.push(child);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { diagnostics, edits };
}

export const jsxFormatRule = {
  id: 'jsx-format',
  docs,
  check(source, options) {
    return formatting(source, options).diagnostics;
  },
  fix(text, fileName, options) {
    let result = text;
    for (let pass = 0; pass < text.length; pass += 1) {
      const source = ts.createSourceFile(fileName, result, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const { edits } = formatting(source, options);
      if (!edits.length) break;
      const selected = [];
      // Parent tag edits run first; a later pass formats nested JSX inside its attributes.
      for (const edit of edits.sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
        if (selected.some((item) => edit.start < item.end && item.start < edit.end)) continue;
        selected.push(edit);
      }
      if (!selected.length) break;
      let next = result;
      for (const edit of selected.sort((a, b) => b.start - a.start)) next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`;
      if (next === result) break;
      result = next;
    }
    return result;
  },
  count(text, fileName, options) {
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return formatting(source, options).diagnostics;
  },
};
