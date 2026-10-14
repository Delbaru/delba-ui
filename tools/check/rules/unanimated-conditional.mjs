import ts from 'typescript';

import { checkerOf, position, unwrap } from './ast.mjs';

/** Условный JSX по данным не равен появлению по интерактивному состоянию. */
export const unanimatedConditionalRule = {
  count(text, fileName) {
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const checker = checkerOf(source);
    const parameter = (declaration) => {
      let owner = declaration;
      while (ts.isBindingElement(owner) || ts.isArrayBindingPattern(owner) || ts.isObjectBindingPattern(owner)) owner = owner.parent;
      return ts.isParameter(owner);
    };
    const boolean = (node) => {
      const type = checker.getTypeAtLocation(node);
      return !!(type.flags & ts.TypeFlags.BooleanLike) || type.isUnion() && type.types.some((part) => part.flags & ts.TypeFlags.BooleanLike);
    };

    const reactive = (expression, seen = new Set()) => {
      const node = unwrap(expression);
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (!symbol || seen.has(symbol)) return false;
        const next = new Set(seen).add(symbol);
        if (boolean(node) && symbol.declarations?.some(parameter)) return true;
        for (const declaration of symbol.declarations ?? []) {
          let owner = declaration;
          while (ts.isBindingElement(owner) || ts.isArrayBindingPattern(owner) || ts.isObjectBindingPattern(owner)) owner = owner.parent;
          if (ts.isVariableDeclaration(owner) && owner.initializer && reactive(owner.initializer, next)) return true;
        }
        return false;
      }
      if (ts.isCallExpression(node)) {
        const callee = unwrap(node.expression);
        const imported = ts.isIdentifier(callee) ? checker.getSymbolAtLocation(callee)?.declarations?.find(ts.isImportSpecifier) : undefined;
        const name = imported ? (imported.propertyName ?? imported.name).text : ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
        if (/^use[A-Z]/.test(name)) return true;
      }
      if (ts.isPropertyAccessExpression(node)) {
        const base = unwrap(node.expression);
        if (boolean(node) && ts.isIdentifier(base) && checker.getSymbolAtLocation(base)?.declarations?.some(parameter)) return true;
        return reactive(node.expression, seen);
      }
      let found = false;
      ts.forEachChild(node, (child) => { if (reactive(child, seen)) found = true; });
      return found;
    };

    const jsx = (expression) => {
      const node = unwrap(expression);
      return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
    };

    const diagnostics = [];
    const visit = (node) => {
      if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
        const expression = unwrap(node.expression);
        const condition = ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && jsx(expression.right)
          ? expression.left
          : ts.isConditionalExpression(expression) && (jsx(expression.whenTrue) || jsx(expression.whenFalse)) ? expression.condition : null;
        if (condition && reactive(condition)) diagnostics.push(position(source, condition));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return diagnostics;
  },
};
