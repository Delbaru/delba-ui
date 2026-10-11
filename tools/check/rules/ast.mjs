import path from 'node:path';
import ts from 'typescript';

/** Путь модуля от корня без расширения и `/index`: `../core/index.js` и `../core` — один вход. */
export function moduleOf(source, specifier, root) {
  if (!specifier.startsWith('.')) return specifier;
  return path.relative(root, path.resolve(path.dirname(source.fileName), specifier))
    .split(path.sep).join('/').replace(/\.(?:[cm]?[jt]sx?)$/, '').replace(/\/index$/, '');
}

const checkers = new WeakMap();

/**
 * Привязки одного файла без разрешения модулей: чей это идентификатор — импорта, параметра или
 * локальной переменной с тем же именем. Затенение решает компилятор, а не сравнение текста.
 */
export function checkerOf(source) {
  const cached = checkers.get(source);
  if (cached) return cached;
  const options = { noResolve: true, noLib: true, types: [], jsx: ts.JsxEmit.Preserve };
  const host = ts.createCompilerHost(options);
  const own = (name) => path.resolve(name) === path.resolve(source.fileName);
  host.getSourceFile = (name) => (own(name) ? source : undefined);
  host.fileExists = own;
  host.readFile = () => undefined;
  const checker = ts.createProgram([source.fileName], options, host).getTypeChecker();
  checkers.set(source, checker);
  return checker;
}

const isWrapper = (node) => ts.isParenthesizedExpression(node) || ts.isAwaitExpression(node) || ts.isAsExpression(node)
  || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node);

/** Выражение без скобок, `await`, `as`, `satisfies` и `!`. */
export function unwrap(node) {
  let current = node;
  while (isWrapper(current)) current = current.expression;
  return current;
}

/** Внешний узел цепочки обёрток: от `import(…)` до `(await import(…))`. */
export function outermost(node) {
  let current = node;
  while (current.parent && isWrapper(current.parent)) current = current.parent;
  return current;
}

/** Все идентификаторы файла, привязанные к тому же символу, что объявление `name`. */
export function referencesOf(source, name) {
  const checker = checkerOf(source);
  const symbol = checker.getSymbolAtLocation(name);
  if (!symbol) return [];
  const found = [];
  const visit = (node) => {
    if (ts.isIdentifier(node) && node !== name && node.text === name.text && checker.getSymbolAtLocation(node) === symbol) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Имя свойства, которое читают у выражения: `x.a`, `x['a']`, `const { a } = x`. */
export function readsOf(node) {
  const outer = outermost(node);
  const parent = outer.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === outer) return [parent.name];
  if (ts.isElementAccessExpression(parent) && parent.expression === outer && ts.isStringLiteralLike(parent.argumentExpression)) {
    return [parent.argumentExpression];
  }
  if (ts.isVariableDeclaration(parent) && parent.initializer === outer && ts.isObjectBindingPattern(parent.name)) {
    return parent.name.elements.map((item) => item.propertyName ?? item.name);
  }
  return [];
}

export function textOf(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  if (ts.isComputedPropertyName(node) && ts.isStringLiteralLike(node.expression)) return node.expression.text;
  return undefined;
}

export function position(source, node) {
  const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return { line: line + 1, column: character + 1 };
}
