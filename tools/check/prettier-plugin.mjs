import typescript from 'prettier/plugins/typescript';
import estree from 'prettier/plugins/estree';
import { builders } from 'prettier/doc';
import ts from 'typescript';

import { jsxFormatRule } from './rules/jsx-format.mjs';

const baseParser = typescript.parsers.typescript;
const basePrinter = estree.printers.estree;
const { group } = builders;

function attachSource(node, source, seen = new WeakSet()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (node.type === 'JSXElement') Object.defineProperty(node, '__jsxSource', { value: source });
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => attachSource(child, source, seen));
    else attachSource(value, source, seen);
  }
}

function hasComment(source, start, end) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source);
  scanner.setTextPos(start);
  while (scanner.getTextPos() < end) {
    const token = scanner.scan();
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) return true;
  }
  return false;
}

function compactElement(node, options) {
  const child = node.children?.[0];
  if (node.children?.length !== 1 || child?.type !== 'JSXExpressionContainer') return undefined;
  if (!['Identifier', 'MemberExpression'].includes(child.expression?.type)) return undefined;
  const source = node.__jsxSource;
  const [start, end] = node.range ?? [];
  if (!source || start == null || end == null || hasComment(source, start, end)) return undefined;
  const text = source.slice(start, end);
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const prefix = source.slice(lineStart, start);
  // The parent may move an inline conditional across lines while printing. Count only
  // the element's indentation so eligibility cannot toggle with parent layout.
  const indent = prefix.match(/^[ \t]*/)?.[0] ?? '';
  const estimate = text.replace(/\r?\n[ \t]*/g, ' ');
  return indent.length + estimate.length <= options.printWidth ? {} : undefined;
}

export const parsers = {
  typescript: {
    ...baseParser,
    preprocess(text, options) {
      const prepared = baseParser.preprocess ? baseParser.preprocess(text, options) : text;
      return /\.tsx$/i.test(options.filepath ?? '')
        ? jsxFormatRule.fix(prepared, options.filepath, { printWidth: options.printWidth, tabWidth: options.tabWidth })
        : prepared;
    },
    async parse(text, options) {
      const parsed = await baseParser.parse(text, options);
      attachSource(parsed.ast ?? parsed, text);
      return parsed;
    },
  },
};

export const printers = {
  estree: {
    ...basePrinter,
    print(path, options, print) {
      const node = path.getValue();
      const compact = node?.type === 'JSXElement' ? compactElement(node, options) : undefined;
      if (compact) {
        const opening = ['<', path.call(print, 'openingElement', 'name')];
        if (node.openingElement.typeArguments) {
          opening.push(path.call(print, 'openingElement', 'typeArguments'));
        }
        for (let index = 0; index < node.openingElement.attributes.length; index += 1) {
          opening.push(' ', path.call(print, 'openingElement', 'attributes', index));
        }
        opening.push(node.openingElement.selfClosing ? ' />' : '>');
        return group([
          group(opening),
          '{',
          path.call(print, 'children', 0, 'expression'),
          '}',
          path.call(print, 'closingElement'),
        ]);
      }
      return basePrinter.print(path, options, print);
    },
  },
};
