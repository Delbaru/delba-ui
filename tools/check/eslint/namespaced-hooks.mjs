/**
 * Supplements react-hooks/rules-of-hooks for the public os.*.use() spelling.
 * It recognizes bindings, not an unrelated object's property named `use`.
 * This is deliberately a conservative syntactic guard, not a full CFG/data-flow
 * analyzer; the official React rule remains mandatory for normal hooks.
 */
import { resolveImport } from './import-boundaries.mjs';
const PUBLIC_MODULES = /^src\/crm\/client(?:\/os)?(?:\/index(?:\.[cm]?[jt]sx?)?)?$/;
const FACTORIES = new Set(['useOs', 'createOs']);
const REACT_WRAPPERS = new Set(['memo', 'forwardRef']);
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const LOOP_TYPES = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement']);
const TRANSPARENT = new Set([
  'ChainExpression', 'TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression',
  'TSSatisfiesExpression', 'TSInstantiationExpression', 'ParenthesizedExpression',
]);

function unwrap(node) {
  let expression = node;
  while (expression && TRANSPARENT.has(expression.type)) expression = expression.expression;
  return expression;
}

function memberName(node) {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string') return node.property.value;
  if (node.computed && node.property.type === 'TemplateLiteral' && !node.property.expressions.length)
    return node.property.quasis[0].value.cooked;
  return null;
}

function keyName(property) {
  if (property.computed && property.key.type !== 'Literal') return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') return property.key.value;
  return null;
}

function bindingPath(pattern, identifier, path = []) {
  if (!pattern) return null;
  if (pattern.type === 'Identifier') return pattern.name === identifier ? path : null;
  if (pattern.type === 'AssignmentPattern') return bindingPath(pattern.left, identifier, path);
  if (pattern.type !== 'ObjectPattern') return null;
  for (const property of pattern.properties) {
    if (property.type !== 'Property') continue;
    const key = keyName(property);
    if (key === null) continue;
    const found = bindingPath(property.value, identifier, [...path, key]);
    if (found !== null) return found;
  }
  return null;
}

function inside(node, ancestor) {
  for (let current = node; current; current = current.parent) if (current === ancestor) return true;
  return false;
}

function branchGuards(node, ancestors) {
  if (node.optional) return true;
  for (let callee = unwrap(node.callee); callee?.type === 'MemberExpression'; callee = unwrap(callee.object)) {
    if (callee.optional) return true;
  }
  for (const parent of ancestors) {
    if (parent.type === 'MemberExpression' && parent.optional) return true;
    if (parent.type === 'CallExpression' && parent.optional) return true;
    if (LOOP_TYPES.has(parent.type) || parent.type === 'TryStatement' || parent.type === 'CatchClause' || parent.type === 'SwitchCase') return true;
    if (parent.type === 'IfStatement' && (inside(node, parent.consequent) || inside(node, parent.alternate))) return true;
    if (parent.type === 'ConditionalExpression' && (inside(node, parent.consequent) || inside(node, parent.alternate))) return true;
    // The left operand is evaluated on every render. The right is not.
    if (parent.type === 'LogicalExpression' && inside(node, parent.right)) return true;
  }
  return false;
}

function containsReturn(node, visitorKeys) {
  if (!node) return false;
  if (node.type === 'ReturnStatement') return true;
  if (FUNCTION_TYPES.has(node.type) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression') return false;
  for (const key of visitorKeys[node.type] ?? []) {
    const child = node[key];
    if (Array.isArray(child)) {
      if (child.some(entry => entry?.type && containsReturn(entry, visitorKeys))) return true;
    } else if (child?.type && containsReturn(child, visitorKeys)) return true;
  }
  return false;
}

function ownerName(node) {
  const parent = node.parent;
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.init === node && parent.id.type === 'Identifier') return parent.id.name;
  if (parent.type === 'Property' && parent.value === node && !parent.computed) return keyName(parent);
  if (parent.type === 'ExportDefaultDeclaration' && parent.declaration === node) return 'DefaultExport';
  return null;
}

export const namespacedHooksRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce React hook placement for the public os.*.use API (binding-aware)' },
    schema: [],
    messages: {
      context: 'os.*.use is a React hook: call it only inside a component or custom hook.',
      conditional: 'os.*.use cannot run conditionally, in a loop, through optional chaining, or within try/catch.',
      earlyReturn: 'os.*.use is after a possible early return: keep hook call order constant.',
      computed: 'Dynamic os namespace member calls are forbidden: use an explicit statically named API.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const visitorKeys = source.visitorKeys;

    function lookup(identifier) {
      let scope = source.getScope(identifier);
      while (scope) {
        const variable = scope.set.get(identifier.name);
        if (variable) return variable;
        scope = scope.upper;
      }
      return null;
    }

    function importedBinding(variable) {
      const def = variable?.defs.find(entry => entry.type === 'ImportBinding');
      if (!def || def.parent?.type !== 'ImportDeclaration') return null;
      const path = def.parent.source.value;
      if (path === '@delba/frontend' && def.node.type === 'ImportNamespaceSpecifier') return 'ui-module';
      if (path === '@delba/frontend' && def.node.type === 'ImportSpecifier' && (def.node.imported.name ?? def.node.imported.value) === 'ui') return 'namespace';
      if (PUBLIC_MODULES.test(resolveImport(context.filename ?? context.getFilename(), path) ?? '')) {
        if (def.node.type === 'ImportNamespaceSpecifier') return 'module';
        if (def.node.type === 'ImportSpecifier' && FACTORIES.has(def.node.imported.name ?? def.node.imported.value)) return 'factory';
      }
      if (path === 'react') {
        if (def.node.type === 'ImportNamespaceSpecifier' || def.node.type === 'ImportDefaultSpecifier') return 'react-module';
        if (def.node.type === 'ImportSpecifier' && REACT_WRAPPERS.has(def.node.imported.name ?? def.node.imported.value)) return 'react-wrapper';
      }
      return null;
    }

    function propertyOrigin(base, name) {
      if (base === 'module') return FACTORIES.has(name) ? 'factory' : 'other';
      if (base === 'react-module') return REACT_WRAPPERS.has(name) ? 'react-wrapper' : 'other';
      if (base === 'ui-module') return name === 'ui' ? 'namespace' : 'other';
      if (base === 'os' || base === 'namespace') return /^use(?:[A-Z0-9]\w*)?$/.test(name) ? 'hook' : 'namespace';
      return base === 'dynamic' ? 'dynamic' : 'other';
    }

    function origin(original, seen = new Set()) {
      const node = unwrap(original);
      if (!node) return 'other';
      if (node.type === 'CallExpression') {
        const callee = origin(node.callee, seen);
        if (callee === 'factory') return 'os';
        // A statically resolved bound resource remains a namespace, but hook results do not.
        if (callee === 'namespace') return 'namespace';
        return 'other';
      }
      if (node.type === 'MemberExpression') {
        const base = origin(node.object, seen);
        if (base === 'other') return base;
        const name = memberName(node);
        if (name === null) return base === 'os' || base === 'namespace' || base === 'dynamic' ? 'dynamic' : 'other';
        return propertyOrigin(base, name);
      }
      if (node.type !== 'Identifier') return 'other';
      const variable = lookup(node);
      if (!variable || seen.has(variable)) return 'other';
      const imported = importedBinding(variable);
      if (imported) return imported;
      const definition = variable.defs.find(entry => entry.type === 'Variable' && entry.node.type === 'VariableDeclarator');
      // An alias must be a const binding. Arguments, assignments and mutable vars
      // cannot be proven to have the public os identity at this call site.
      if (!definition || definition.parent?.kind !== 'const') return 'other';
      const path = bindingPath(definition.node.id, node.name);
      if (path === null) return 'other';
      const next = new Set(seen);
      next.add(variable);
      let state = origin(definition.node.init, next);
      for (const key of path) state = propertyOrigin(state, key);
      return state;
    }

    function isReactWrapper(callee) {
      const bare = unwrap(callee);
      // Accept the conventional shorthand in source snippets with an unbound
      // `memo`/`forwardRef`; the TS compiler still requires a real import.
      if (bare?.type === 'Identifier' && REACT_WRAPPERS.has(bare.name) && !lookup(bare)) return true;
      return origin(callee) === 'react-wrapper';
    }

    function hookOwner(fn) {
      if (fn.type === 'FunctionDeclaration') return fn.id?.name ?? null;
      const declared = fn.id?.name ?? null;
      if (declared && /^(?:[A-Z]|use[A-Z0-9])/.test(declared)) return declared;
      let candidate = fn;
      while (candidate) {
        let parent = candidate.parent;
        while (parent && TRANSPARENT.has(parent.type) && parent.expression === candidate) {
          candidate = parent;
          parent = candidate.parent;
        }
        const direct = ownerName(candidate);
        if (direct) return direct;
        if (parent?.type !== 'CallExpression' || !parent.arguments.includes(candidate) || !isReactWrapper(parent.callee)) break;
        candidate = parent;
      }
      return declared;
    }

    return {
      VariableDeclarator(node) {
        // An unknown destructuring key cannot safely be treated as a stable os API path.
        if (node.id.type !== 'ObjectPattern') return;
        const base = origin(node.init);
        if (base !== 'os' && base !== 'namespace') return;
        if (node.id.properties.some(property => property.type === 'Property' && keyName(property) === null)) {
          context.report({ node, messageId: 'computed' });
        }
      },
      CallExpression(node) {
        const state = origin(node.callee);
        if (state === 'dynamic') { context.report({ node, messageId: 'computed' }); return; }
        if (state !== 'hook') return;
        const ancestors = source.getAncestors(node);
        const fn = [...ancestors].reverse().find(parent => FUNCTION_TYPES.has(parent.type));
        const name = fn && hookOwner(fn);
        if (!fn || fn.async || fn.generator || !/^(?:[A-Z]|use[A-Z0-9])/.test(name ?? '')) {
          context.report({ node, messageId: 'context' });
          return;
        }
        const intervening = ancestors.slice(ancestors.indexOf(fn) + 1);
        if (branchGuards(node, intervening)) { context.report({ node, messageId: 'conditional' }); return; }
        if (fn.body.type !== 'BlockStatement') return;
        let statement = node;
        while (statement.parent && statement.parent !== fn.body) statement = statement.parent;
        if (statement.parent !== fn.body) return;
        const position = fn.body.body.indexOf(statement);
        if (position > 0 && fn.body.body.slice(0, position).some(previous => containsReturn(previous, visitorKeys))) {
          context.report({ node, messageId: 'earlyReturn' });
        }
      },
    };
  },
};

export default namespacedHooksRule;
