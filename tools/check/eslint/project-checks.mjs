import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { importBoundaryViolation } from './import-boundaries.mjs';

const TEST_FILE = /\.(?:test|spec|type-test|typecheck)\.[cm]?[jt]sx?$/i;
const SOURCE_FILE = /\.[cm]?[jt]sx?$/i;
const slash = value => value.split(path.sep).join('/');
function filesIn(root, dirs) {
    const visit = directory => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === '.git' ? [] : visit(file);
        return SOURCE_FILE.test(entry.name) ? [file] : [];
    });
    return dirs.flatMap(dir => visit(path.resolve(root, dir))).sort();
}
function literal(node) {
    return node && (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
}
function frontend(file, root) {
    const relative = slash(path.relative(root, file));
    return /^src\/(?:views|widgets|features|entities)(?:\/|$)/.test(relative);
}
function restricted(file, root, mode) {
    const relative = slash(path.relative(root, file));
    return mode === 'ui' ? relative.startsWith('src/') : Boolean(relative.startsWith('src/'));
}
function position(source, node) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return { line: line + 1, column: character + 1 };
}
function requireCall(expression) {
    return ts.isIdentifier(expression) && ['require', 'createRequire'].includes(expression.text) ||
        ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
            expression.expression.text === 'module' && expression.name.text === 'require';
}
function network(node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'XMLHttpRequest') return true;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') return true;
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    const property = ts.isPropertyAccessExpression(node) ? node.name.text : literal(node.argumentExpression);
    return property === 'fetch' && ts.isIdentifier(node.expression) &&
        ['window', 'globalThis', 'self'].includes(node.expression.text);
}

/** Shared static architecture pass; the ESLint rule uses the same importBoundaryViolation core. */
export function checkImportBoundaries(root, { dirs = ['src'], mode = 'os' } = {}) {
    const issues = [];
    for (const file of filesIn(root, dirs)) {
        const text = fs.readFileSync(file, 'utf8');
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
            file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const client = source.statements.some(statement => ts.isExpressionStatement(statement) &&
            ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
        const report = (node, message, rule = 'import-boundaries') => issues.push({
            ...position(source, node), file, rule, severity: 'error', message,
        });
        const check = (node, specifier, typeOnly = false) => {
            const reason = importBoundaryViolation(file, specifier, typeOnly, { client, root });
            if (reason) report(node, reason);
        };
        if (slash(path.relative(root, file)).startsWith('src/widgets/Shared/')) report(source, 'widgets/Shared is not an FSD slice.');
        const visit = node => {
            if (ts.isImportDeclaration(node)) {
                const specifier = literal(node.moduleSpecifier);
                if (specifier !== null) {
                    const clause = node.importClause;
                    const typeOnly = Boolean(clause?.isTypeOnly || !clause?.name && clause?.namedBindings &&
                        (ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 &&
                            clause.namedBindings.elements.every(item => item.isTypeOnly)));
                    check(node, specifier, typeOnly);
                }
            } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
                const specifier = literal(node.moduleSpecifier);
                if (specifier !== null) check(node, specifier, Boolean(node.isTypeOnly ||
                    node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 &&
                    node.exportClause.elements.every(item => item.isTypeOnly)));
            } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
                const specifier = literal(node.moduleReference.expression);
                if (specifier !== null) check(node, specifier, node.isTypeOnly);
            } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
                const specifier = literal(node.argument.literal);
                if (specifier !== null) check(node, specifier, true);
            } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
                const specifier = literal(node.arguments[0]);
                if (specifier === null && restricted(file, root, mode))
                    report(node, 'Dynamic import must use a static module specifier so architecture boundaries can be verified.');
                else if (specifier !== null) check(node, specifier);
            } else if (ts.isCallExpression(node) && requireCall(node.expression)) {
                const specifier = literal(node.arguments[0]);
                if (specifier === null && restricted(file, root, mode))
                    report(node, 'require() must use a static module specifier so architecture boundaries can be verified.');
                else if (specifier !== null) check(node, specifier);
            } else if (mode !== 'ui' && frontend(file, root) && network(node)) {
                report(node, 'UI consumers do not perform network requests; use the public SDK door.', 'network-boundary');
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return issues;
}

/** Tests belong to root tests/ or a named tools/*/tests harness, never beside runtime modules. */
export function checkTestPlacement(root) {
    const visit = directory => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : visit(file);
        if (!TEST_FILE.test(entry.name)) return [];
        const relative = slash(path.relative(root, file));
        return !relative.startsWith('src/') && relative.split('/').includes('tests') ? [] : [relative];
    });
    return ['src', 'tools'].flatMap(directory => visit(path.join(root, directory))).sort();
}
