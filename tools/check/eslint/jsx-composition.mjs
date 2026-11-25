import ts from 'typescript';

const wrappers = [ts.isParenthesizedExpression, ts.isAsExpression, ts.isSatisfiesExpression, ts.isNonNullExpression];
function unwrap(node) {
    let value = node;
    while (value && wrappers.some(isWrapper => isWrapper(value))) value = value.expression;
    return value;
}
function isJsx(node) { return ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node); }
const functionLike = node => ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node);

function returnedRoots(body) {
    if (!body) return [];
    if (!ts.isBlock(body)) return roots(body);
    const found = [];
    const visit = node => {
        if (node !== body && functionLike(node)) return;
        if (ts.isReturnStatement(node)) { found.push(...roots(node.expression)); return; }
        ts.forEachChild(node, visit);
    };
    visit(body);
    return found;
}
function roots(expression) {
    const node = unwrap(expression);
    if (!node) return [];
    if (isJsx(node)) return [node];
    if (ts.isConditionalExpression(node)) return [...roots(node.whenTrue), ...roots(node.whenFalse)];
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind))
        return [...roots(node.left), ...roots(node.right)];
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(roots);
    return [];
}
function complexity(root) {
    let count = 0, depth = 0, branching = false;
    const visit = (node, level) => {
        if (ts.isFunctionLike(node) || ts.isJsxAttributes(node) || ts.isObjectLiteralExpression(node)) return;
        if (isJsx(node)) { count++; level++; depth = Math.max(depth, level); }
        if (level > 0 && (ts.isConditionalExpression(node) ||
            ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)))
            branching = true;
        ts.forEachChild(node, child => visit(child, level));
    };
    visit(root, 0);
    return count >= 5 || depth >= 3 || (count >= 3 && branching);
}
function inFunction(node) {
    for (let parent = node.parent; parent; parent = parent.parent) if (ts.isFunctionLike(parent)) return true;
    return false;
}

/** Review hint only: local layout values are warned; JSX slots and render callbacks stay legal. */
export function checkJsxComposition(source) {
    const issues = [];
    const visit = node => {
        let name, expression;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            name = node.name; expression = node.initializer;
        } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(node.left)) {
            name = node.left; expression = node.right;
        }
        if (name && expression && inFunction(node) && roots(expression).some(complexity)) {
            const { line, character } = source.getLineAndCharacterOfPosition(name.getStart(source));
            issues.push({ line: line + 1, column: character + 1, node: name, severity: 'warning',
                message: `Сложное локальное JSX-дерево ${name.text} скрывает композицию.`,
                fix: 'Проверьте самостоятельность блока; используйте именованный компонент или прямую JSX-композицию. Слоты и render props допустимы.' });
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return issues;
}

export const jsxCompositionRule = {
    id: 'jsx-composition',
    docs: 'docs/specs/architecture/principles.md',
    check(source) { return checkJsxComposition(source); },
    meta: { type: 'suggestion', schema: [], messages: { layout: 'Review this local JSX layout; JSX slots and render props remain supported.' } },
    create(context) {
        return {
            'Program:exit'(node) {
                const services = context.sourceCode.parserServices;
                const source = services?.esTreeNodeToTSNodeMap?.get(node);
                if (!source) return;
                for (const issue of checkJsxComposition(source)) {
                    context.report({ loc: { start: { line: issue.line, column: issue.column - 1 } }, messageId: 'layout' });
                }
            },
        };
    },
};

export const fileLengthRule = {
    id: 'file-length',
    docs: 'docs/specs/architecture/principles.md',
    check(source, { max = 200 } = {}) {
        if (/\.(?:test|spec|type-test|typecheck|d)\.[cm]?[jt]sx?$/.test(source.fileName) ||
            /(?:^|[\\/])generated(?:[\\/]|$)/.test(source.fileName)) return [];
        const lines = source.text.split(/\r?\n/).length;
        return lines > max ? [{ line: max + 1, column: 1, severity: 'warning',
            message: `Файл содержит ${lines} строк (ориентир ${max}); оцените связность, не дробите механически.` }] : [];
    },
    meta: { type: 'suggestion', schema: [{ type: 'object', properties: { max: { type: 'integer', minimum: 1 } }, additionalProperties: false }], messages: { length: 'File has {{lines}} lines (guideline {{max}}); review cohesion without mechanical splitting.' } },
    create(context) {
        const max = context.options[0]?.max ?? 200;
        return { 'Program:exit'(node) {
            if (/\.(?:test|spec|type-test|typecheck|d)\.[cm]?[jt]sx?$/.test(context.filename) ||
                /(?:^|[\\/])generated(?:[\\/]|$)/.test(context.filename)) return;
            const lines = context.sourceCode.lines.length;
            if (lines > max) context.report({ node, loc: { start: { line: max + 1, column: 0 } },
                messageId: 'length', data: { lines, max } });
        } };
    },
};
