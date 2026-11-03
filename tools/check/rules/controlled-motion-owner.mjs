import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { checkerOf, unwrap } from './ast.mjs';

const openingOf = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
const attribute = (node, name) => node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name);
const expression = attribute => attribute?.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : null;

/** A declared portal owner is verified through real import/export bindings to the public Modal. */
export function controlledMotionOwners(source) {
  const sources = new Map([[path.resolve(source.fileName), source]]);
  const read = file => {
    if (!sources.has(file)) sources.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
    return sources.get(file);
  };
  const moduleFile = (from, specifier) => {
    let target;
    if (specifier.startsWith('.')) target = path.resolve(path.dirname(from.fileName), specifier);
    else if (specifier.startsWith('@/')) {
      for (let dir = path.dirname(path.resolve(from.fileName)); ; dir = path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'tsconfig.json'))) { target = path.join(dir, 'src', specifier.slice(2)); break; }
        if (path.dirname(dir) === dir) return null;
      }
    } else return null;
    return [target, `${target}.tsx`, `${target}.ts`, path.join(target, 'index.tsx'), path.join(target, 'index.ts')]
      .find(file => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
  };
  const imported = (from, module, name, seen) => {
    if (module === '@delba/ui' && name === 'Modal') return { modal: true };
    const file = moduleFile(from, module);
    return file ? exported(read(file), name, seen) : null;
  };
  const exported = (from, name, seen) => {
    const key = `${from.fileName}:${name}`;
    if (seen.has(key)) return null;
    const next = new Set(seen).add(key);
    for (const statement of from.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === name && statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)) return { source: from, fn: statement };
      if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
      if (!statement.exportClause && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const found = imported(from, statement.moduleSpecifier.text, name, next);
        if (found) return found;
      }
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const item = statement.exportClause.elements.find(item => !item.isTypeOnly && item.name.text === name);
        if (!item) continue;
        const original = (item.propertyName ?? item.name).text;
        if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) return imported(from, statement.moduleSpecifier.text, original, next);
        const fn = from.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === original);
        if (fn) return { source: from, fn };
      }
    }
    return null;
  };
  const binding = (from, name) => {
    const declaration = checkerOf(from).getSymbolAtLocation(name)?.declarations?.find(ts.isImportSpecifier);
    if (!declaration || declaration.isTypeOnly || declaration.parent.parent.isTypeOnly) return null;
    const module = declaration.parent.parent.parent.moduleSpecifier;
    return ts.isStringLiteral(module) ? imported(from, module.text, (declaration.propertyName ?? declaration.name).text, new Set()) : null;
  };
  const roots = fn => {
    const result = [];
    const visit = node => {
      if (node !== fn && ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node) && node.expression) {
        const value = unwrap(node.expression);
        if (ts.isJsxFragment(value)) result.push(...value.children.map(openingOf).filter(Boolean));
        else if (openingOf(value)) result.push(openingOf(value));
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(fn);
    return result;
  };
  const openValue = opening => {
    const prop = attribute(opening, 'open');
    if (!prop || opening.attributes.properties.slice(opening.attributes.properties.indexOf(prop) + 1).some(ts.isJsxSpreadAttribute)) return null;
    const value = expression(prop);
    return value && (ts.isIdentifier(value) && value.text === 'open' || ts.isPropertyAccessExpression(value) && value.name.text === 'open') ? value : null;
  };
  const reachesModal = (owner, seen = new Set()) => {
    if (owner?.modal) return true;
    if (!owner || seen.has(owner.fn)) return false;
    const next = new Set(seen).add(owner.fn);
    return roots(owner.fn).some(root => openValue(root) && ts.isIdentifier(root.tagName) && reachesModal(binding(owner.source, root.tagName), next));
  };
  return opening => {
    if (!ts.isIdentifier(opening.tagName)) return false;
    const owner = binding(source, opening.tagName);
    if (!owner?.fn || !ts.getJSDocTags(owner.fn).some(tag => tag.tagName.text === 'ui-motion-owner' && ts.getTextOfJSDocComment(tag.comment)?.trim() === 'open')) return false;
    const prop = attribute(opening, 'open');
    if (!expression(prop) || opening.attributes.properties.slice(opening.attributes.properties.indexOf(prop) + 1).some(ts.isJsxSpreadAttribute)) return false;
    return reachesModal(owner);
  };
}
