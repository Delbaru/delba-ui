import path from 'node:path';
import ts from 'typescript';
import { checkerOf, position, unwrap } from './ast.mjs';

const RESPONSIVE = new Set(('bg p px py pt pr pb pl m mx my mt mr mb ml w minW maxW h minH maxH r tlr trr brr blr borderTLR borderTRR borderBRR borderBLR border borderC borderS borderW borderT borderR borderB borderL aspectRatio grow position top bottom left right hide dir align justify wrap gap columnGap rowGap columns variant color').split(' '));
const parse = (text, file) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const opening = node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
const attribute = (node, name) => node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name);
const expression = attribute => attribute?.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : undefined;
const literal = attribute => attribute?.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined;
const constant = node => ts.isIdentifier(node) && /^[A-Z][A-Z0-9_]{2,}$/.test(node.text);

/** Literal component-name classes in actual class values; utility/vendor names and module access stay intact. */
export function globalComponentMarkers(source) {
  const found = new Map();
  const following = new Set();
  const classProperty = name => /(?:^className$|ClassName$)/.test(name);
  const nameOf = node => ts.isIdentifier(node) || ts.isStringLiteralLike(node) ? node.text : '';
  const classCalls = new Set(['cx', 'clsx', 'classNames']);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings
      || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
    for (const specifier of statement.importClause.namedBindings.elements) {
      if (classCalls.has(specifier.propertyName?.text ?? specifier.name.text)) classCalls.add(specifier.name.text);
    }
  }
  const words = (node, text, startBoundary = true, endBoundary = true) => {
    for (const match of text.matchAll(/\S+/g)) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(match[0])) continue;
      if (match.index === 0 && !startBoundary || match.index + match[0].length === text.length && !endBoundary) continue;
      found.set(`${node.pos}:${match[0]}`, { node, name: match[0] });
    }
  };
  const inspect = value => {
    if (!value) return;
    const node = unwrap(value);
    if (ts.isStringLiteralLike(node)) words(node, node.text);
    else if (ts.isTemplateExpression(node)) {
      const parts = [node.head, ...node.templateSpans.map(span => span.literal)];
      parts.forEach((part, index) => words(part, part.text, index === 0, index === parts.length - 1));
      node.templateSpans.forEach((span, index) => {
        if ((!parts[index].text || /\s$/.test(parts[index].text))
          && (!span.literal.text || /^\s/.test(span.literal.text))) inspect(span.expression);
      });
    } else if (ts.isConditionalExpression(node)) {
      inspect(node.whenTrue); inspect(node.whenFalse);
    } else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      inspect(node.left); inspect(node.right);
    } else if (ts.isArrayLiteralExpression(node)) node.elements.forEach(inspect);
    else if (ts.isSpreadElement(node)) inspect(node.expression);
    else if (ts.isIdentifier(node)) {
      const declaration = checkerOf(source).getSymbolAtLocation(node)?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && !following.has(declaration)) {
        following.add(declaration); inspect(declaration.initializer); following.delete(declaration);
      }
    } else if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && classCalls.has(node.expression.text)) node.arguments.forEach(inspect);
      else if (ts.isPropertyAccessExpression(node.expression) && ['join', 'filter'].includes(node.expression.name.text)) inspect(node.expression.expression);
    }
  };
  const visit = node => {
    if (ts.isJsxAttribute(node) && classProperty(node.name.getText(source))) {
      inspect(node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer);
    } else if ((ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node))
      && classProperty(nameOf(node.name))) inspect(node.initializer);
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && classProperty(node.left.name.text)) inspect(node.right);
    else if (ts.isCallExpression(node)) {
      const call = node.expression;
      if (ts.isIdentifier(call) && classCalls.has(call.text)) node.arguments.forEach(inspect);
      else if (ts.isPropertyAccessExpression(call) && ts.isPropertyAccessExpression(call.expression)
        && call.expression.name.text === 'classList' && ['add', 'toggle', 'replace'].includes(call.name.text)) node.arguments.forEach(inspect);
      else if (ts.isPropertyAccessExpression(call) && call.name.text === 'setAttribute'
        && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) && node.arguments[0].text === 'class') inspect(node.arguments[1]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...found.values()];
}

export const globalComponentClassRule = {
  count(text, file) {
    const source = parse(text, file);
    return globalComponentMarkers(source).map(({ node }) => position(source, node));
  },
};

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
  const ownStyles = source.statements.filter(node => ts.isImportDeclaration(node)
    && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './' + name + '.module.scss')
    .map(node => node.importClause?.name).filter(Boolean);
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  if (!ownStyles.length || !component?.body) return false;
  const checker = checkerOf(source);
  const bindings = new Set(ownStyles.map(node => checker.getSymbolAtLocation(node)).filter(Boolean));
  const isOwnStyles = node => ts.isIdentifier(node) && bindings.has(checker.getSymbolAtLocation(node));
  const root = component.body.statements.find(ts.isReturnStatement)?.expression;
  const element = root && unwrap(root);
  if (!element || !ts.isJsxElement(element) && !ts.isJsxSelfClosingElement(element)) return false;
  const host = ts.isJsxElement(element) ? element.openingElement : element;
  const marker = attribute(host, 'className'); let found = false;
  const visit = node => {
    if (ts.isPropertyAccessExpression(node) && isOwnStyles(node.expression) && node.name.text === name) found = true;
    if (ts.isElementAccessExpression(node) && isOwnStyles(node.expression) && node.argumentExpression
      && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === name) found = true;
    ts.forEachChild(node, visit);
  };
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
