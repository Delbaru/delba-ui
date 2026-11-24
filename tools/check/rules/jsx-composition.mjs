import ts from 'typescript';
import { position, unwrap } from './ast.mjs';

// Count only the local layout, not slot callbacks, props or configuration objects.
function complexity(expression) {
  let nodes = 0;
  let depth = 0;
  let branching = false;
  function visit(node, level) {
    if (ts.isFunctionLike(node) || ts.isJsxAttributes(node) || ts.isObjectLiteralExpression(node)) return;
    if (ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node)) {
      nodes++;
      level++;
      depth = Math.max(depth, level);
    }
    if (level > 0 && (ts.isConditionalExpression(node) ||
        ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) branching = true;
    ts.forEachChild(node, child => visit(child, level));
  }
  const value = unwrap(expression);
  if (ts.isJsxElement(value) || ts.isJsxFragment(value) || ts.isJsxSelfClosingElement(value) ||
      ts.isConditionalExpression(value) || ts.isArrayLiteralExpression(value) || ts.isBinaryExpression(value)) {
    visit(value, 0);
  }
  return nodes >= 5 || (nodes >= 3 && (depth >= 3 || branching));
}

function local(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isFunctionLike(parent)) return true;
  }
  return false;
}

/** Review hint, never an error or autofix: independent visual responsibilities need names. */
export const jsxCompositionRule = {
  id: 'jsx-composition',
  docs: 'docs/specs/architecture/principles.md',
  check(source) {
    const issues = [];
    function visit(node) {
      let name;
      let expression;
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        name = node.name;
        expression = node.initializer;
      } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
        name = node.left;
        expression = node.right;
      }
      if (name && expression && local(node) && complexity(expression)) {
        issues.push({
          ...position(source, name),
          severity: 'warning',
          message: `Сложное локальное JSX-дерево ${name.text} скрывает композицию.`,
          fix: 'Проверьте самостоятельность блока; используйте именованный компонент или прямую JSX-композицию. Слоты и короткие значения допустимы.',
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return issues;
  },
};
