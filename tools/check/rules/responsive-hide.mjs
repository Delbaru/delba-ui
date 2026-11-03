import ts from 'typescript';
import { position } from './ast.mjs';

const legacy = /^data-hide-(?:mobile|tablet|desktop|pc)$/;

export const responsiveHideRule = {
  id: 'responsive-hide',
  docs: 'docs/specs/ui/components.md',
  check(source) {
    const issues = [];
    const visit = (node) => {
      let name;
      if (ts.isJsxAttribute(node)) name = node.name.text;
      else if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
        const key = ts.isComputedPropertyName(node.name) ? node.name.expression : node.name;
        if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) name = key.text;
      }
      if (name && legacy.test(name)) issues.push({
        ...position(source, node),
        message: `${name}: responsive data-атрибут удалён.`,
        fix: 'Используйте полный hide={[desktop, mobile, tablet]} на публичной коробке. data-hide-scrollbar — отдельная механика.',
      });
      ts.forEachChild(node, visit);
    };
    visit(source);
    return issues;
  },
};
