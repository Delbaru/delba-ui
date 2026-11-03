import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { checkerOf, position } from './ast.mjs';
import { globalComponentMarkers } from './project-props.mjs';

const ignoredFile = /\.(?:test|typecheck|type-test|d)\.tsx?$/;
const componentName = /^[A-Z][A-Za-z0-9]*$/;
// Reviewed lifecycle adapters add no DOM; their visual owner keeps the marker.
const nonvisualAdapters = new Map([
  ['Modal/Modal.tsx:Modal', 'Public mode dispatcher; ModalSurface owns the DOM.'],
  ['Modal/Modal.tsx:DeclarativeModal', 'Declaration/trigger adapter; ModalSurface owns the DOM.'],
  ['Text/animations/textSlide/TextSlide.tsx:TextSlide', 'Dispatches to three renderers; each owns its DOM root.'],
  ['Text/Text.tsx:CollapsibleText', 'Retains children while CollapseWrap owns the transition DOM.'],
]);
const isProvider = (tag) => ts.isPropertyAccessExpression(tag) && tag.name.text === 'Provider';

/** Named JSX functions, including internal parts. Hooks and text/array render helpers are not components. */
export function visualComponents(source) {
  const found = [];
  const visit = (node) => {
    const name = ts.isFunctionDeclaration(node) ? node.name?.text
      : ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) ? node.name.text : undefined;
    const fn = ts.isFunctionDeclaration(node) ? node
      : ts.isVariableDeclaration(node) && node.initializer
        && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) ? node.initializer : undefined;
    if (name && componentName.test(name) && fn?.body) {
      const tags = [];
      const collect = (child) => {
        // Local callbacks may render parts, but their owner does not become a second owner of those DOM nodes.
        if (child !== fn.body && (ts.isFunctionLike(child) || ts.isClassDeclaration(child))) return;
        if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) tags.push(child.tagName);
        ts.forEachChild(child, collect);
      };
      collect(fn.body);
      if (tags.some((tag) => !isProvider(tag))) found.push({ name, node, body: fn.body });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function parse(file) {
  return fs.existsSync(file) ? ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true) : undefined;
}

function moduleImports(source) {
  return source.statements.filter(ts.isImportDeclaration).filter((node) =>
    ts.isStringLiteralLike(node.moduleSpecifier) && node.moduleSpecifier.text.endsWith('.module.scss'));
}

/** Prove the owning CSS-module reference is used in a className value, not in a comment/example. */
function hasNamedClass(source, name, stylesheet) {
  const bindings = moduleImports(source).filter((node) =>
    path.resolve(path.dirname(source.fileName), node.moduleSpecifier.text) === stylesheet)
    .map((node) => node.importClause?.name?.text).filter(Boolean);
  let found = false;
  const checker = checkerOf(source);
  const visit = (node) => {
    const value = ts.isJsxAttribute(node) && node.name.text === 'className' ? node.initializer
      : ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) && node.name.text === 'className' ? node.initializer
        : undefined;
    if (value) {
      let scoped = false;
      const followed = new Set();
      const inspect = (child) => {
        if (ts.isPropertyAccessExpression(child) && ts.isIdentifier(child.expression)
          && bindings.includes(child.expression.text) && child.name.text === name) scoped = true;
        if (ts.isElementAccessExpression(child) && ts.isIdentifier(child.expression)
          && bindings.includes(child.expression.text) && child.argumentExpression
          && ts.isStringLiteralLike(child.argumentExpression) && child.argumentExpression.text === name) scoped = true;
        if (ts.isIdentifier(child)) {
          const symbol = checker.getSymbolAtLocation(child);
          const declaration = symbol?.valueDeclaration;
          if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer && !followed.has(declaration)) {
            followed.add(declaration);
            inspect(declaration.initializer);
          }
        }
        ts.forEachChild(child, inspect);
      };
      inspect(value);
      if (scoped) found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export const componentAnatomyRule = {
  id: 'component-anatomy',
  docs: 'docs/authoring.md',
  check(source, { root }) {
    const relative = path.relative(path.resolve(root, 'src/components'), source.fileName);
    if (relative.startsWith('..') || path.isAbsolute(relative) || ignoredFile.test(source.fileName)) return [];
    const diagnostics = [];
    const components = visualComponents(source);
    const owner = path.basename(source.fileName).replace(/\.(?:model|config)\.tsx?$/, '').replace(/\.tsx?$/, '');
    const ownedStylesheets = new Set([owner, ...components.map(({ name }) => name)].map((name) => name + '.module.scss'));
    const report = (node, message, fix) => diagnostics.push({ ...position(source, node), message, fix });
    for (const declaration of moduleImports(source)) {
      const target = path.resolve(path.dirname(source.fileName), declaration.moduleSpecifier.text);
      if (path.dirname(target) !== path.resolve(path.dirname(source.fileName)) || !ownedStylesheets.has(path.basename(target))) report(declaration,
        'Компонент импортирует SCSS родителя или соседней части.',
        'Перенесите принадлежащие части селекторы в её собственный локальный Name.module.scss. Общие миксины берите из core.');
    }
    for (const { node, name } of globalComponentMarkers(source)) report(node,
      `Глобальный класс ${name} дублирует имя компонента.`,
      'Используйте собственный styles.Name; пустой модуль может не создать DOM-класс. Не добавляйте фиктивный CSS.');
    for (const { name, node } of components) {
      if (nonvisualAdapters.has(relative.split(path.sep).join('/') + ':' + name)) continue;
      const own = path.join(path.dirname(source.fileName), `${name}.module.scss`);
      if (!fs.existsSync(own)) {
        report(node, `${name}: отсутствует собственный ${name}.module.scss.`, 'Добавьте локальный модуль с именованным корневым селектором, даже без деклараций.');
        continue;
      }
      const css = fs.readFileSync(own, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      if (!new RegExp(`\\.${name}(?![\\w-])`).test(css)) report(node,
        `${name}: в собственном SCSS отсутствует .${name}.`, 'Определите именованный корневой селектор; не добавляйте фиктивные декларации.');
      const owners = [source, parse(path.join(path.dirname(source.fileName), `${name}.model.ts`)),
        parse(path.join(path.dirname(source.fileName), `${name}.config.ts`))].filter(Boolean);
      if (!owners.some((owner) => hasNamedClass(owner, name, own))) report(node,
        `${name}: className не использует собственный styles.${name}.`,
        'На существующем корне используйте styles.Name или cx(styles.Name, className). Для модели оформления допустим className в Name.model.ts/config.ts.');
    }
    return diagnostics;
  },
};
