import path from 'node:path';

const layers = ['shared', 'entities', 'features', 'widgets', 'views', 'app'];
const slash = value => value.replaceAll('\\', '/');
const indexFile = /^(?:index(?:\.(?:[cm]?[jt]sx?))?)?$/;

export function sourcePath(filename) {
    const normalized = slash(filename);
    const index = normalized.lastIndexOf('/src/');
    return index >= 0 ? normalized.slice(index + 1) : normalized.startsWith('src/') ? normalized : null;
}

export function resolveImport(filename, specifier) {
    const source = sourcePath(filename);
    const name = slash(specifier);
    if (name.startsWith('@/')) return path.posix.normalize('src/' + name.slice(2));
    if (name.startsWith('src/')) return path.posix.normalize(name);
    if (source && (name.startsWith('./') || name.startsWith('../'))) {
        return path.posix.normalize(path.posix.join(path.posix.dirname(source), name));
    }
  if (name.startsWith('./') || name.startsWith('../')) {
    return sourcePath(slash(path.resolve(path.dirname(filename), name)));
  }
    return null;
}

function literalSpecifier(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node?.type === 'TemplateLiteral' && node.expressions?.length === 0)
        return node.quasis?.[0]?.value?.cooked ?? null;
    return null;
}

function location(filename) {
    const [root, layer, slice, ...rest] = filename.split('/');
    if (root !== 'src' || !layers.includes(layer)) return null;
    return { layer, slice, rest };
}

// Explicit browser-safe projections, not a blanket Core/SDK exemption.
const browserProjections = new Map([
    ['src/crm/client/api/assistant.ts', new Set([
        'src/crm/core/assistant/history/Conversation.contract',
        'src/crm/core/assistant/readFeedback/Feedback.contract',
        'src/crm/core/assistant/uploads/Upload.contract',
        'src/crm/core/assistant/mcpToken/Connect.contract',
    ])],
    ['src/crm/client/api/assistantDrafts.ts', new Set(['src/crm/core/assistant/workflowDraft/Workflow.contract'])],
    ['src/crm/client/api/assistantFeedback.ts', new Set(['src/crm/core/assistant/readFeedback/Feedback.contract'])],
    ['src/crm/client/api/assistantStream.ts', new Set(['src/crm/core/assistant/history/Conversation.contract'])],
    ['src/crm/client/generated/chat.ts', new Set(['src/crm/core/chat/sendMessage/Send.result'])],
    ['src/crm/client/Chat/Message/Receipt.ts', new Set(['src/crm/core/chat/sendMessage/Receipt.result'])],
    ['src/crm/client/Chat/Presentation.ts', new Set(['src/crm/core/messageLimits', 'src/crm/core/messageReactions'])],
    ['src/crm/client/Task/Presentation.ts', new Set(['src/crm/core/tasks/shared/taskLabels', 'src/crm/core/tasks/shared/taskFieldRights', 'src/crm/core/tasks/shared/checklistStatuses', 'src/crm/core/tasks/shared/taskTransitions'])],
    ['src/crm/client/Project/Presentation.ts', new Set(['src/crm/core/projects/shared/projectRow', 'src/crm/core/projectContactTypes'])],
    ['src/crm/client/Assistant/Presentation.ts', new Set(['src/crm/api/contracts/assistant/messageSources', 'src/crm/core/assistant/actionsSchema/actionText'])],
    ['src/crm/client/Session/Presentation.ts', new Set(['src/crm/core/access/nav', 'src/crm/core/access/roles', 'src/crm/core/sessions/loginReturn/loginReturn'])],
    ['src/crm/client/Time/Presentation.ts', new Set(['src/crm/core/time/Activity', 'src/crm/core/hours'])],
    ['src/crm/client/Meetings/Presentation.ts', new Set(['src/crm/core/meetings/contracts'])],
    ['src/crm/client/Settings/Presentation.ts', new Set(['src/crm/core/weather/types'])],
]);
const serverPath = /^src\/crm\/(?:api|core|gateway|server|http|db)(?:\/|$)/;
// Explicit lightweight presentation door; avoids loading React/RTK for pure models.
const publicSdk = /^(?:src\/crm\/client(?:\/os)?(?:\/index(?:\.[cm]?[jt]sx?)?)?|src\/crm\/client\/(?:Task|Time)\/Presentation(?:\.[cm]?[jt]sx?)?)$/;
const serverAuth = /^src\/crm\/(?:api(?:\/requireViewer)?|gateway(?:\/index)?|core\/(?:access|errors))(?:\/index)?(?:\.[cm]?[jt]sx?)?$/;
const clientPath = /^src\/crm\/client(?:\/|$)/;
const legacyWidgets = /^src\/crm\/widgets(?:\/|$)/;

const testFilePattern = /\.(?:test|spec|type-test|typecheck)\.[cm]?[jt]sx?$/i;
function projectRootFor(filename, suppliedRoot) {
    if (suppliedRoot) return path.resolve(suppliedRoot);
    const normalized = slash(path.resolve(filename));
    const marker = normalized.lastIndexOf('/src/');
    return marker >= 0 ? normalized.slice(0, marker) : path.dirname(path.resolve(filename));
}
export function resolveProjectPath(filename, specifier, root) {
    const name = slash(specifier);
    if (name.startsWith('@/')) return path.posix.normalize('src/' + name.slice(2));
    if (name.startsWith('src/')) return path.posix.normalize(name);
    if (!name.startsWith('./') && !name.startsWith('../')) return null;
    const projectRoot = projectRootFor(filename, root);
    const absolute = path.resolve(path.dirname(filename), name);
    return path.relative(projectRoot, absolute).split(path.sep).join('/');
}
export function isTestSource(filename) {
    const normalized = slash(filename);
    return normalized.split('/').includes('tests') || testFilePattern.test(normalized);
}
export function isTestTarget(target) {
    if (!target) return false;
    const normalized = slash(target);
    return normalized.split('/').includes('tests') || testFilePattern.test(normalized);
}

export function importBoundaryViolation(filename, specifier, typeOnly = false, options = {}) {
    const projectTarget = resolveProjectPath(filename, specifier, options.root);
    if (!isTestSource(filename) && isTestTarget(projectTarget))
        return 'Runtime source cannot import tests, type fixtures or test fixtures.';
    const source = sourcePath(filename);
    if (!source) return null;
    const from = location(source);
    const target = resolveImport(filename, specifier);
    if (!target) return null;
    const plainTarget = target.replace(/\.[cm]?[jt]sx?$/, '');
    if (clientPath.test(source)) {
        if (!typeOnly && serverPath.test(target) &&
            !browserProjections.get(source)?.has(plainTarget)) {
            return 'Client runtime cannot import server implementations; expose an explicit browser-safe contract.';
        }
        return null;
    }
    if (!from && !legacyWidgets.test(source)) return null;
    const to = location(target);
    if (!from) {
        if (!typeOnly && serverPath.test(target)) return 'Legacy widget must use the public SDK instead of server runtime.';
        if (!typeOnly && clientPath.test(target) && !publicSdk.test(target))
            return 'Legacy widget still imports a private client module; migrate to the public SDK.';
        return null;
    }
    if (legacyWidgets.test(target) && from.layer === 'shared')
        return 'Shared cannot depend on legacy subject widgets.';
    if (to) {
        if (to.layer === 'widgets' && to.slice === 'Shared') return 'widgets/Shared is not an FSD slice.';
        if (layers.indexOf(to.layer) > layers.indexOf(from.layer)) return 'FSD dependencies point down, never up.';
        if (to.layer === from.layer && to.slice === from.slice) return null;
        if (to.layer === from.layer && !['shared', 'app'].includes(to.layer)) {
            return 'Independent slices on the same layer cannot import one another.';
        }
        if (!['shared', 'app'].includes(to.layer) && to.rest.length &&
            !(to.rest.length === 1 && indexFile.test(to.rest[0]))) {
            return 'Import the public slice index, not a private segment.';
        }
        return null;
    }
    if (!typeOnly && serverPath.test(target)) {
        // Server pages may authorize via the server door; API route files may project server handlers.
        if (from.layer === 'app' && !options.client &&
            (serverAuth.test(target) || (source.startsWith('src/app/api/') && /\/route\.[cm]?[jt]s$/.test(source)))) return null;
        return 'Server implementation is not a frontend dependency; use the public SDK.';
    }
    if (!typeOnly && clientPath.test(target) && !publicSdk.test(target)) {
        return 'Import the public SDK door instead of private client implementation.';
    }
    return null;
}

export const importBoundariesRule = {
    meta: { type: 'problem', schema: [], messages: { violation: '{{reason}}' } },
    create(context) {
        const filename = context.filename ?? context.getFilename();
        let client = false;
        function check(node, source, typeOnly = false) {
            if (typeof source?.value !== 'string') return;
            const reason = importBoundaryViolation(filename, source.value, typeOnly, { client });
            if (reason) context.report({ node, messageId: 'violation', data: { reason } });
        }
        return {
            Program(node) {
                client = node.body?.some(statement => statement.type === 'ExpressionStatement' &&
                    statement.directive === 'use client') ?? false;
                const source = sourcePath(filename);
                if (source?.startsWith('src/widgets/Shared/')) {
                    context.report({ node, messageId: 'violation', data: { reason: 'widgets/Shared is not an FSD slice.' } });
                }
            },
            ImportDeclaration(node) {
                check(node, node.source, node.importKind === 'type' ||
                    (node.specifiers.length > 0 && node.specifiers.every(item => item.importKind === 'type')));
            },
            ExportNamedDeclaration(node) {
                check(node, node.source, node.exportKind === 'type' ||
                    (node.specifiers.length > 0 && node.specifiers.every(item => item.exportKind === 'type')));
            },
            ExportAllDeclaration(node) { check(node, node.source, node.exportKind === 'type'); },
            TSImportEqualsDeclaration(node) {
                if (node.moduleReference?.type === 'TSExternalModuleReference')
                    check(node, node.moduleReference.expression, node.importKind === 'type');
            },
            TSImportType(node) {
                const argument = node.argument ?? node.source;
                check(node, argument?.literal ?? argument, true);
            },
            ImportExpression(node) {
                const specifier = literalSpecifier(node.source);
                if (specifier === null) {
                    const source = sourcePath(filename);
                    if (location(source ?? '') || clientPath.test(source ?? '') || legacyWidgets.test(source ?? '')) {
                        context.report({ node, messageId: 'violation', data: {
                            reason: 'Dynamic import must use a static module specifier so architecture boundaries can be verified.',
                        } });
                    }
                } else check(node, { value: specifier });
            },
            CallExpression(node) {
                const callee = node.callee;
                const isRequire = callee?.type === 'Identifier' && callee.name === 'require';
                const isModuleRequire = callee?.type === 'MemberExpression' &&
                    callee.object?.type === 'Identifier' && callee.object.name === 'module' &&
                    callee.property?.name === 'require';
                const isFetch = callee?.type === 'Identifier' && callee.name === 'fetch' ||
                    callee?.type === 'MemberExpression' && ['window', 'globalThis', 'self'].includes(callee.object?.name) &&
                    callee.property?.name === 'fetch';
                if (isFetch) {
                    const source = sourcePath(filename);
                    if (/^src\/(?:views|widgets|features|entities)(?:\/|$)/.test(source ?? '')) {
                        context.report({ node, messageId: 'violation', data: { reason: 'UI consumers do not perform network requests; use the public SDK door.' } });
                    }
                }
                if (!isRequire && !isModuleRequire) return;
                const specifier = literalSpecifier(node.arguments[0]);
                if (specifier === null) {
                    const source = sourcePath(filename);
                    if (location(source ?? '') || clientPath.test(source ?? '') || legacyWidgets.test(source ?? '')) {
                        context.report({ node, messageId: 'violation', data: {
                            reason: 'require() must use a static module specifier so architecture boundaries can be verified.',
                        } });
                    }
                } else check(node, { value: specifier });
            },
            NewExpression(node) {
                if (node.callee?.type === 'Identifier' && node.callee.name === 'XMLHttpRequest') {
                    const source = sourcePath(filename);
                    if (/^src\/(?:views|widgets|features|entities)(?:\/|$)/.test(source ?? '')) {
                        context.report({ node, messageId: 'violation', data: { reason: 'UI consumers do not perform network requests; use the public SDK door.' } });
                    }
                }
            },
        };
    },
};
