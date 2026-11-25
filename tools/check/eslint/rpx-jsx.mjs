import ts from 'typescript';

// Resolve the actual component prop type, not the JSX spelling. This preserves
// aliases, inherited props and mapped types such as Omit<FlexProps, ...>.
const responsiveNames = new Set(['ResponsiveValue', 'ResponsiveInput', 'ResponsiveSpaceValue']);
const responsiveSource = /[/\\]src[/\\]core[/\\](?:base[/\\]responsive|layout[/\\]space)\.(?:d\.)?ts$/;

function responsiveSymbol(checker, symbol) {
  if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return responsiveNames.has(symbol?.name) &&
    (symbol?.declarations ?? []).some(declaration => responsiveSource.test(declaration.getSourceFile().fileName));
}

export function isResponsiveDeclaration(checker, node, seen = new Set()) {
  if (!node || seen.has(node)) return false;
  seen.add(node);
  if (ts.isTypeReferenceNode(node)) {
    const symbol = checker.getSymbolAtLocation(node.typeName);
    if (responsiveSymbol(checker, symbol)) return true;
    return (symbol?.declarations ?? []).some(declaration => isResponsiveDeclaration(checker, declaration.type, seen));
  }
  return ts.forEachChild(node, child => isResponsiveDeclaration(checker, child, seen)) === true;
}

function responsiveType(checker, type, seen = new Set()) {
  if (!type || seen.has(type)) return false;
  seen.add(type);
  if (responsiveSymbol(checker, type.aliasSymbol ?? type.getSymbol())) return true;
  if (type.flags & (ts.TypeFlags.Union | ts.TypeFlags.Intersection)) {
    return type.types.some(branch => responsiveType(checker, branch, seen));
  }
  return false;
}

function componentPropsType(checker, attribute) {
  const element = attribute.parent?.parent;
  if (!element || !(ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element))) return undefined;
  const component = checker.getTypeAtLocation(element.tagName);
  const signature = checker.getSignaturesOfType(component, ts.SignatureKind.Call)[0];
  const parameter = signature?.getParameters()[0];
  return parameter ? checker.getTypeOfSymbolAtLocation(parameter, element) : undefined;
}

export function responsiveJsxProperty(checker, attribute) {
  const candidates = [
    checker.getContextualType(attribute.parent),
    componentPropsType(checker, attribute),
  ];
  return candidates.some(props => {
    if (!props) return false;
    const property = checker.getPropertyOfType(props, attribute.name.getText());
    if (!property) return false;
    if (property.declarations?.some(declaration => isResponsiveDeclaration(checker, declaration.type))) return true;
    return responsiveType(checker, checker.getTypeOfSymbolAtLocation(property, attribute));
  });
}

export function hasExplicitResponsiveTuple(expression) {
  if (!expression) return false;
  if (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(expression.type))
    return hasExplicitResponsiveTuple(expression.expression);
  if (expression.type === 'ConditionalExpression')
    return hasExplicitResponsiveTuple(expression.consequent) && hasExplicitResponsiveTuple(expression.alternate);
  return expression.type === 'ArrayExpression' && expression.elements.length === 3 &&
    expression.elements.every(element => element && element.type !== 'SpreadElement');
}

export const rpxJsxRule = {
  meta: {type:'problem',schema:[],messages:{tuple:'Responsive DelbaUI prop {{prop}} expects an explicit three-value tuple.', types:'RPX validation requires TypeScript parser services.'}},
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();
    return {
      Program(node) {
        if (!checker) context.report({node, messageId: 'types'});
      },
      JSXAttribute(node) {
        if (!checker) return;
        const attribute = services.esTreeNodeToTSNodeMap.get(node);
        if (!responsiveJsxProperty(checker, attribute)) return;
        const expression = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        if (!hasExplicitResponsiveTuple(expression))
          context.report({node,messageId:'tuple',data:{prop:node.name.name}});
      },
    };
  },
};

export const jsxGroupingRule = {
  meta:{type:'suggestion',schema:[],messages:{group:'Avoid blank lines between every repeated sibling; group JSX by meaning.'}},
  create(context) {
    return {JSXElement(node) {
      const children=node.children.filter(c=>c.type!=='JSXText'||c.value.trim());
      if(children.length<4 || !children.every(c=>c.type==='JSXElement'))return;
      const key=c=>context.sourceCode.getText(c.openingElement.name);
      if(!children.every(c=>key(c)===key(children[0])))return;
      if(children.slice(1).every((c,i)=>c.loc.start.line-children[i].loc.end.line>1))
        context.report({node:children[1],messageId:'group'});
    }};
  },
};


/** TypeScript-AST form shared by the UI checker; requires actual component prop metadata. */
export function hasExplicitResponsiveTupleTs(expression) {
    if (!expression) return false;
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
        ts.isSatisfiesExpression(expression) || ts.isNonNullExpression(expression))
        return hasExplicitResponsiveTupleTs(expression.expression);
    if (ts.isConditionalExpression(expression))
        return hasExplicitResponsiveTupleTs(expression.whenTrue) && hasExplicitResponsiveTupleTs(expression.whenFalse);
    return ts.isArrayLiteralExpression(expression) && expression.elements.length === 3 &&
        expression.elements.every(element => !ts.isSpreadElement(element) && !ts.isOmittedExpression(element));
}

export const responsiveTupleRule = {
    id: 'responsive-tuple',
    docs: 'docs/specs/architecture/principles.md',
    check(source, { checker } = {}) {
        if (!checker) return [];
        const issues = [];
        const visit = node => {
            if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
                for (const attribute of node.attributes.properties) {
                    if (!ts.isJsxAttribute(attribute) || !responsiveJsxProperty(checker, attribute)) continue;
                    const value = attribute.initializer && ts.isJsxExpression(attribute.initializer)
                        ? attribute.initializer.expression : attribute.initializer;
                    if (!hasExplicitResponsiveTupleTs(value)) {
                        const { line, character } = source.getLineAndCharacterOfPosition(attribute.getStart(source));
                        issues.push({ line: line + 1, column: character + 1, severity: 'error',
                            message: `Responsive DelbaUI prop ${attribute.name.getText(source)} expects an explicit three-value tuple.` });
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
        return issues;
    },
};
