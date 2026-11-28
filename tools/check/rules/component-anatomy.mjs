import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { checkerOf, position } from './ast.mjs';
import { globalComponentMarkers } from './project-props.mjs';

const ignoredFile = /\.(?:test|typecheck|type-test|d)\.tsx?$/;
const componentName = /^[A-Z][A-Za-z0-9]*$/;
export const publicComponentScaffolds = [
  'Accordion', 'Accordion/AccordionItem', 'Button', 'Calendar',
  'Carousel', 'Carousel/CarouselDots', 'Carousel/CarouselNav',
  'NativeCarousel/CarouselProgress', 'NativeCarousel/CarouselTimer',
  'Checkbox', 'ChoiceButtons', 'Dropdown', 'DurationPicker', 'Flex',
  'GradientBorder', 'Grid', 'Grid/GridItem', 'Icon', 'Img', 'Input',
  'Marquee', 'MediaDropDown', 'Modal', 'Modal/ModalProvider', 'NativeCarousel',
  'PageTransition', 'PhoneField', 'Radio', 'ScrollArea',
  'ScrollArea/ScrollbarActivity', 'Section', 'Select', 'Skeleton',
  'SwitchButton', 'TabTrack', 'Text', 'Textarea',
  'Toast/ToastProvider', 'Tooltip', 'Video', 'VideoPlayer',
].map(directory => ({ directory, name: path.basename(directory) })).concat([
  { directory: 'RichText', name: 'LexicalText' },
  { directory: 'RichTextarea', name: 'LexicalTextarea' },
]);
// Reviewed lifecycle adapters add no DOM; their visual owner keeps the marker.
const nonvisualAdapters = new Map([
  ['PageTransition/PageTransition.tsx:PageTransition', 'React ViewTransition owns native snapshots; this boundary adds no DOM element.'],
  ['Modal/Modal.tsx:Modal', 'Public mode dispatcher; ModalSurface owns the DOM.'],
  ['Modal/Modal.tsx:DeclarativeModal', 'Declaration/trigger adapter; ModalSurface owns the DOM.'],
  ['Text/animations/textSlide/TextSlide.tsx:TextSlide', 'Dispatches to three renderers; each owns its DOM root.'],
]);
const isProvider = (tag) => ts.isPropertyAccessExpression(tag) && tag.name.text === 'Provider';

function expressionOf(node) {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}

/** Consumer roles author small props and visual data in the TSX that renders them. */
export function checkDComponentAuthoring(source) {
  const diagnostics = [];
  const maps = [];
  const forbidden = new Set();
  const report = (node, message, fix) => diagnostics.push({ ...position(source, node), message, fix });
  const visit = (node) => {
    if (ts.isIdentifier(node) && (/^(?:.*_)?(?:AXES|SCALES)$/.test(node.text)
        || ['defineSkin', 'useSkin', 'skinPad', 'skinRadius'].includes(node.text))) forbidden.add(node.text);
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)
        && /\.(?:config|types|skin)(?:\.[cm]?[jt]sx?)?$/.test(node.moduleSpecifier.text)) report(node,
      'D-роль импортирует отдельный config/types/skin вместо публичного входа.',
      'Малые собственные props и presets перенесите в TSX; соседние роли импортируйте через их публичный вход.');
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const named = /^(?:presets|[A-Za-z0-9_]*Presets|[A-Z0-9_]*PRESETS)$/.test(node.name.text);
      if (named && node.initializer) {
        const value = expressionOf(node.initializer);
        const statement = node.parent.parent;
        if (!ts.isVariableStatement(statement) || !ts.isSourceFile(statement.parent)) report(node,
          'Локальные presets D-роли должны находиться на уровне модуля.',
          'Перенесите обычный объект presets над компонентом.');
        if (!ts.isObjectLiteralExpression(value)) report(node,
          'Presets D-роли должны быть обычным локальным объектом.',
          'Запишите визуальные props и states непосредственно в presets, без фабрики или промежуточной таблицы.');
        else {
          maps.push({ node, count: value.properties.filter(property => !ts.isSpreadAssignment(property)).length });
          const inspect = (child) => {
            if (ts.isSpreadAssignment(child)) report(child,
              'Presets D-роли не используют общие style-спреды.',
              'Запишите визуальные поля непосредственно; именованный preset части передайте через её объектный слот.');
            if (ts.isIdentifier(child) && ['common', 'sizes'].includes(child.text)) report(child,
              `Presets D-роли используют промежуточную таблицу ${child.text}.`,
              'Запишите геометрию и состояния непосредственно в каждом пресете.');
            ts.forEachChild(child, inspect);
          };
          inspect(value);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const count = maps.reduce((total, map) => total + map.count, 0);
  if (count > 6) report(maps[0].node,
    `У D-роли ${count} локальных визуальных пресетов; максимум 6.`,
    'Объедините случайные варианты; данные и действия передавайте props экземпляра.');
  for (const name of forbidden) report(source,
    `Авторский код D-роли использует ${name}.`,
    'Используйте обычные локальные presets с публичным типом Frontend и явные props/states.');
  return diagnostics;
}

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
  docs: 'docs/development.md',
  check(source, { root }) {
    const projectRelative = path.relative(root, source.fileName).split(path.sep).join('/');
    if (/^src\/(?:shared|cms)\/ui\/D[A-Z][A-Za-z0-9]*\/[^/]+\.tsx$/.test(projectRelative)
        && !ignoredFile.test(source.fileName)) return checkDComponentAuthoring(source);
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
      if (!css.trim()) continue;
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

/** Native mechanisms retain their reviewed types/config split, distinct from consumer D-roles. */
export function checkComponentScaffolds(root) {
  const diagnostics = [];
  for (const { directory: component, name } of publicComponentScaffolds) {
    const directory = path.join(root, 'src/components', component);
    const requiredFiles = [
      `${name}.types.ts`, `${name}.config.ts`, `${name}.tsx`,
      `${name}.module.scss`, 'index.ts',
    ];
    for (const requiredFile of requiredFiles) {
      const file = path.join(directory, requiredFile);
      if (fs.statSync(file, { throwIfNoEntry: false })?.isFile()) continue;
      diagnostics.push({
        file,
        line: 1,
        column: 1,
        rule: componentAnatomyRule.id,
        severity: 'error',
        docs: path.join(root, componentAnatomyRule.docs),
        message: `${name}: отсутствует ${requiredFile}.`,
      });
    }
  }
  return diagnostics;
}
