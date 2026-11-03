import ts from 'typescript';

import { checkerOf, position, unwrap } from './ast.mjs';
import { controlledMotionOwners } from './controlled-motion-owner.mjs';

/** Условный JSX по данным не равен появлению по интерактивному состоянию. */
export const unanimatedConditionalRule = {
  count(text, fileName) {
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const checker = checkerOf(source);
    const controlledOwner = controlledMotionOwners(source);
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

    const attribute = (opening, name) => opening.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(source) === name);
    const value = item => item?.initializer && ts.isJsxExpression(item.initializer) ? item.initializer.expression : item?.initializer;
    const resolve = (expression, seen = new Set()) => {
      if (!expression) return null;
      const node = unwrap(expression);
      if (!ts.isIdentifier(node)) return node;
      const symbol = checker.getSymbolAtLocation(node);
      if (!symbol || seen.has(symbol)) return node;
      const declaration = symbol.declarations?.find(ts.isVariableDeclaration);
      return declaration?.initializer ? resolve(declaration.initializer, new Set(seen).add(symbol)) : node;
    };
    const property = (object, name) => {
      if (!object || !ts.isObjectLiteralExpression(object)) return null;
      const entry = object.properties.find(item =>
        (ts.isPropertyAssignment(item) || ts.isShorthandPropertyAssignment(item))
          && item.name.getText(source).replace(/['"]/g, '') === name);
      if (entry && ts.isPropertyAssignment(entry)) return entry.initializer;
      return entry && ts.isShorthandPropertyAssignment(entry) ? entry.name : null;
    };
    const reads = expression => {
      const paths = new Set();
      const visit = node => {
        if (ts.isPropertyAccessExpression(node)) { paths.add(node.getText(source).replace(/\s/g, '')); return; }
        if (ts.isIdentifier(node)) {
          if (node.text === 'undefined' && !checker.getSymbolAtLocation(node)?.declarations?.length) return;
          paths.add(node.text);
          return;
        }
        ts.forEachChild(node, visit);
      };
      if (expression) visit(unwrap(expression));
      return paths;
    };
    const covers = (key, condition) => {
      if (!key) return false;
      const paths = new Set([...reads(key), ...reads(resolve(key))]);
      return [reads(condition), reads(resolve(condition))].some(required => required.size > 0 && [...required].every(path => [...paths].some(owner => path === owner || path.startsWith(owner + '.'))));
    };
    const ownsMotion = (element, condition, direct = false) => {
      if (!ts.isJsxElement(element) && !ts.isJsxSelfClosingElement(element)) return false;
      const opening = ts.isJsxElement(element) ? element.openingElement : element;
      if (direct && controlledOwner(opening)) {
        const open = value(attribute(opening, 'open'));
        const dependencies = reads(open);
        const intersects = [...reads(condition)].some(path => [...dependencies].some(owner => path === owner || path.startsWith(owner + '.') || owner.startsWith(path + '.')));
        if (!intersects) return true;
      }
      const collapse = resolve(value(attribute(opening, 'collapse')));
      if (direct && collapse && property(collapse, 'open')) return true;
      const motion = resolve(value(attribute(opening, 'animate')));
      const when = property(motion, 'when'), effect = property(motion, 'effect');
      if (!when || !ts.isStringLiteralLike(when) || !effect) return false;
      if (direct) return ['load', 'change', 'inView'].includes(when.text);
      if (when.text === 'change') return covers(property(motion, 'key'), condition);
      if (when.text === 'load') return covers(value(attribute(opening, 'key')), condition);
      return false;
    };
    const motionOwned = (expression, container, condition) => {
      const node = unwrap(expression);
      const branches = ts.isConditionalExpression(node) ? [node.whenTrue, node.whenFalse] : ts.isBinaryExpression(node) ? [node.right] : [];
      const rendered = branches.filter(jsx);
      if (rendered.length && rendered.every(branch => ownsMotion(unwrap(branch), condition, true))) return true;
      let parent = container.parent;
      while (parent) {
        if (ts.isJsxElement(parent)) {
          if (ownsMotion(parent, condition)) return true;
          const tag = parent.openingElement.tagName.getText(source);
          if (!/^(?:Flex|Grid|Box|Text|DBox|DText|div|span|section|label)$/.test(tag)) break;
        } else if (!ts.isJsxExpression(parent) && !ts.isJsxFragment(parent) && !ts.isBinaryExpression(parent) && !ts.isConditionalExpression(parent) && !ts.isParenthesizedExpression(parent)) break;
        parent = parent.parent;
      }
      return false;
    };

    const diagnostics = [];
    const visit = (node) => {
      if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
        const expression = unwrap(node.expression);
        const condition = ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && jsx(expression.right)
          ? expression.left
          : ts.isConditionalExpression(expression) && (jsx(expression.whenTrue) || jsx(expression.whenFalse)) ? expression.condition : null;
        if (condition && reactive(condition) && !motionOwned(expression, node, condition)) diagnostics.push(position(source, condition));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return diagnostics;
  },
};
