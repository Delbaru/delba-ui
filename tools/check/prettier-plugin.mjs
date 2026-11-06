import typescript from 'prettier/plugins/typescript';
import estree from 'prettier/plugins/estree';
import { builders, utils } from 'prettier/doc';
import ts from 'typescript';

import { jsxFormatRule } from './rules/jsx-format.mjs';

const baseParser = typescript.parsers.typescript;
const basePrinter = estree.printers.estree;
const { group, indent, softline } = builders;

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

function compactElement(node) {
  const child = node.children?.[0];
  if (node.children?.length !== 1 || child?.type !== 'JSXExpressionContainer') return undefined;
  const expression = child.expression?.type === 'ChainExpression' ? child.expression.expression : child.expression;
  if (!['Identifier', 'MemberExpression'].includes(expression?.type)) return undefined;
  const source = node.__jsxSource;
  const [start, end] = node.range ?? [];
  if (!source || start == null || end == null || hasComment(source, start, end)) return undefined;
  return true;
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
      const compact = node?.type === 'JSXElement' && compactElement(node);
      if (compact) {
        const opening = path.call(print, 'openingElement');
        const closing = path.call(print, 'closingElement');
        const content = group([
          opening,
          indent([softline, '{', utils.removeLines(path.call(print, 'children', 0, 'expression')), '}']),
          softline,
          closing,
        ]);
        // Keep native parentheses/indentation around conditional JSX. Only replace
        // its content group; softlines measure the final document, not source columns.
        const native = basePrinter.print(path, options, print);
        const compactContent = Symbol('compactContent');
        utils.traverseDoc(native, (doc) => {
          const parts = doc.type === 'group' && doc.contents;
          if (Array.isArray(parts) && parts[0] === opening && parts.at(-1) === closing) doc[compactContent] = true;
        });
        return utils.mapDoc(native, (doc) => doc[compactContent] ? content : doc);
      }
      return basePrinter.print(path, options, print);
    },
  },
};
