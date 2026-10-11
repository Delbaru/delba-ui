import path from 'node:path';
import ts from 'typescript';

import { moduleOf, outermost, position, readsOf, referencesOf, textOf, unwrap } from './ast.mjs';

const ENGINE = 'animateCollapse';
// Входы ядра, которые отдают движок: barrel и сам модуль.
const ENGINE_MODULES = new Set(['src/core', 'src/core/base/collapse']);
const fix = 'Используйте CollapseWrap для подключения сворачивания.';

/**
 * Что делают с результатом `import()`: сразу читают свойство (`reads`) или кладут модуль в имя,
 * через которое читают дальше (`holders`) — переменная или параметр `.then`.
 */
function dynamicUse(call) {
  const outer = outermost(call);
  const parent = outer.parent;
  if (ts.isVariableDeclaration(parent) && parent.initializer === outer && ts.isIdentifier(parent.name)) {
    return { reads: [], holders: [parent.name] };
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name.text === 'then' && ts.isCallExpression(parent.parent)
    && parent.parent.expression === parent) {
    const callback = parent.parent.arguments[0] && unwrap(parent.parent.arguments[0]);
    const param = callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) ? callback.parameters[0] : undefined;
    if (param && ts.isIdentifier(param.name)) return { reads: [], holders: [param.name] };
    if (param && ts.isObjectBindingPattern(param.name)) {
      return { reads: param.name.elements.map((item) => item.propertyName ?? item.name), holders: [] };
    }
  }
  return { reads: readsOf(call), holders: [] };
}

export const collapseRule = {
  id: 'collapse',
  docs: 'docs/authoring.md',
  /**
   * Движок сворачивания в модулях компонентов: именованные импорты и реэкспорты, `export *`,
   * чтение через namespace-импорт и через `import()`. Namespace ядра ради других помощников и
   * type-only записи разрешены: ошибкой считается только доказанное обращение к движку.
   */
  check(source, { root }) {
    const relative = path.relative(root, source.fileName).split(path.sep).join('/');
    if (!relative.startsWith('src/components/')) return [];
    const isEngine = (specifier) => ts.isStringLiteralLike(specifier) && ENGINE_MODULES.has(moduleOf(source, specifier.text, root));
    const found = [];
    const report = (node, message) => found.push({ ...position(source, node), message, fix });
    const reportReads = (names, message) => {
      for (const name of names) if (textOf(name) === ENGINE) report(name, message);
    };
    const reportHolder = (name, message) => {
      for (const reference of referencesOf(source, name)) reportReads(readsOf(reference), message);
    };

    for (const node of source.statements) {
      const importing = ts.isImportDeclaration(node);
      if (!importing && !ts.isExportDeclaration(node)) continue;
      if (importing ? node.importClause?.isTypeOnly : node.isTypeOnly) continue;
      if (!node.moduleSpecifier || !isEngine(node.moduleSpecifier)) continue;
      const bindings = importing ? node.importClause?.namedBindings : node.exportClause;

      if (!importing && !bindings) {
        report(node, `export * из ядра реэкспортирует ${ENGINE} из модуля компонента.`);
      } else if (!importing && ts.isNamespaceExport(bindings)) {
        report(bindings, `export * as выносит ${ENGINE} из модуля компонента.`);
      } else if (importing && bindings && ts.isNamespaceImport(bindings)) {
        reportHolder(bindings.name, `Обращение к ${ENGINE} через namespace-импорт ядра запрещено.`);
      } else if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) {
        for (const item of bindings.elements) {
          if (item.isTypeOnly || (item.propertyName ?? item.name).text !== ENGINE) continue;
          report(item, importing
            ? `Прямой импорт ${ENGINE} в компоненте запрещён.`
            : `Прямой реэкспорт ${ENGINE} из модуля компонента запрещён.`);
        }
      }
    }

    const message = `Динамический импорт ${ENGINE} в компоненте запрещён.`;
    const visit = (node) => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && isEngine(node.arguments[0])) {
        const { reads, holders } = dynamicUse(node);
        reportReads(reads, message);
        for (const holder of holders) reportHolder(holder, message);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    return found.sort((a, b) => a.line - b.line || a.column - b.column);
  },
};
