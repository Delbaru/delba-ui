import ts from 'typescript';

import { checkerOf, position, unwrap } from './ast.mjs';

const HOOK = 'useImperativeHandle';

/** Импорт из `react`, под которым хук доступен: именованный (с alias) или namespace/default. */
function reactBinding(symbol) {
  const declaration = symbol?.declarations?.[0];
  if (!declaration) return undefined;
  const statement = ts.isImportSpecifier(declaration) ? declaration.parent.parent.parent
    : ts.isNamespaceImport(declaration) ? declaration.parent.parent
      : ts.isImportClause(declaration) ? declaration.parent : undefined;
  if (!statement || !ts.isStringLiteralLike(statement.moduleSpecifier) || statement.moduleSpecifier.text !== 'react') return undefined;
  if (ts.isImportSpecifier(declaration)) {
    return declaration.isTypeOnly || statement.importClause?.isTypeOnly ? undefined : (declaration.propertyName ?? declaration.name).text;
  }
  return statement.importClause?.isTypeOnly ? undefined : '*';
}

function isHookCall(call, checker) {
  const callee = unwrap(call.expression);
  if (ts.isIdentifier(callee)) return reactBinding(checker.getSymbolAtLocation(callee)) === HOOK;
  return ts.isPropertyAccessExpression(callee) && callee.name.text === HOOK && ts.isIdentifier(callee.expression)
    && reactBinding(checker.getSymbolAtLocation(callee.expression)) === '*';
}

/** Фабрика отдаёт `что-то.current` — сам узел, а не ручку с методами. */
function returnsCurrent(factory) {
  const fn = unwrap(factory);
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  const isCurrent = (expression) => {
    const value = expression && unwrap(expression);
    return Boolean(value && ts.isPropertyAccessExpression(value) && value.name.text === 'current');
  };
  if (!ts.isBlock(fn.body)) return isCurrent(fn.body);
  const returns = fn.body.statements.filter(ts.isReturnStatement);
  return returns.length > 0 && returns.length === fn.body.statements.length && returns.every((item) => isCurrent(item.expression));
}

export const domRefRule = {
  id: 'dom-ref',
  docs: 'docs/authoring.md',
  /**
   * `useImperativeHandle(ref, () => node.current, [])` отдаёт узел один раз: после ремоунта узла
   * внешний ref держит старый или `null`. Ручки с методами (`() => ({ focus })`) не затрагиваются.
   */
  check(source) {
    if (!source.text.includes(HOOK)) return [];
    const checker = checkerOf(source);
    const found = [];
    const visit = (node) => {
      if (ts.isCallExpression(node) && node.arguments.length >= 3) {
        const [, factory, deps] = node.arguments;
        if (factory && deps && ts.isArrayLiteralExpression(unwrap(deps)) && unwrap(deps).elements.length === 0
          && returnsCurrent(factory) && isHookCall(node, checker)) {
          found.push({
            ...position(source, node),
            message: `DOM-узел передан через одноразовый ${HOOK}(…, []): после ремоунта ref останется старым.`,
            fix: 'Подключите ref к самому узлу через useMergedRefs (у поля — fieldRef из useFieldControl).',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  },
};
