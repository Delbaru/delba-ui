import path from 'node:path';
import ts from 'typescript';
import { position, unwrap } from './ast.mjs';

const RESPONSIVE = new Set(('bg p px py pt pr pb pl m mx my mt mr mb ml w minW maxW h minH maxH r tlr trr brr blr borderTLR borderTRR borderBRR borderBLR border borderC borderS borderW borderT borderR borderB borderL aspectRatio grow position top bottom left right hide dir align justify wrap gap columnGap rowGap columns variant color').split(' '));
const parse = (text, file) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const opening = node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
const attribute = (node, name) => node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name);
const expression = attribute => attribute?.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : undefined;
const literal = attribute => attribute?.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined;
const constant = node => ts.isIdentifier(node) && /^[A-Z][A-Z0-9_]{2,}$/.test(node.text);

export const constTupleRule = {
  count(text, file) {
    const source = parse(text, file); const diagnostics = [];
    const visit = node => {
      if (opening(node) && /^[A-Z]/.test(node.tagName.getText(source))) {
        for (const item of node.attributes.properties) {
          if (!ts.isJsxAttribute(item) || !RESPONSIVE.has(item.name.getText(source))) continue;
          const value = expression(item); if (!value) continue;
          const unwrapped = unwrap(value);
          if (constant(unwrapped) || ts.isArrayLiteralExpression(unwrapped) && unwrapped.elements.some(element => constant(unwrap(element)))) diagnostics.push(position(source, item));
        }
      }
      ts.forEachChild(node, visit);
    }; visit(source); return diagnostics;
  },
  test(text) { return this.count(text, 'Example.tsx').length > 0; },
};

function declaresRangeOwner(source, file) {
  if (!/^\s*\/\/ @ui-native-control range\s*$/m.test(source.text)) return false;
  const name = path.basename(file, '.tsx');
  const ownStyles = source.statements.some(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './' + name + '.module.scss');
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  if (!ownStyles || !component?.body) return false;
  const root = component.body.statements.find(ts.isReturnStatement)?.expression;
  const element = root && unwrap(root);
  if (!element || !ts.isJsxElement(element) && !ts.isJsxSelfClosingElement(element)) return false;
  const host = ts.isJsxElement(element) ? element.openingElement : element;
  const marker = attribute(host, 'className'); let found = false;
  const visit = node => { if (ts.isStringLiteralLike(node) && node.text === name) found = true; ts.forEachChild(node, visit); };
  if (marker) visit(marker);
  return found ? component : null;
}

export const rawInputRule = {
  count(text, file) {
    const source = parse(text, file); const diagnostics = [];
    const rangeOwner = declaresRangeOwner(source, file);
    const visit = node => {
      if (opening(node) && node.tagName.getText(source) === 'input') {
        const hidden = attribute(node, 'hidden'); const hiddenValue = expression(hidden);
        const filePicker = literal(attribute(node, 'type')) === 'file' && hidden && (!hidden.initializer || hiddenValue?.kind === ts.SyntaxKind.TrueKeyword)
          && !node.attributes.properties.some(ts.isJsxSpreadAttribute);
        let owner = node.parent;
        while (owner && owner !== rangeOwner) owner = owner.parent;
        const range = rangeOwner && owner === rangeOwner && literal(attribute(node, 'type')) === 'range' && ['min', 'max', 'value', 'onChange'].every(name => attribute(node, name)) && !node.attributes.properties.some(ts.isJsxSpreadAttribute);
        if (!filePicker && !range) diagnostics.push(position(source, node));
      }
      ts.forEachChild(node, visit);
    }; visit(source); return diagnostics;
  },
};
