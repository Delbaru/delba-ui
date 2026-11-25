import { importBoundariesRule } from './import-boundaries.mjs';
import { namespacedHooksRule } from './namespaced-hooks.mjs';
import { rpxJsxRule, jsxGroupingRule } from './rpx-jsx.mjs';
import { jsxCompositionRule, fileLengthRule } from './jsx-composition.mjs';

export const rules = {
    'import-boundaries': importBoundariesRule,
    'namespaced-hooks': namespacedHooksRule,
    'rpx-jsx': rpxJsxRule,
    'jsx-grouping': jsxGroupingRule,
    'jsx-composition': jsxCompositionRule,
    'file-length': fileLengthRule,
};
export const plugin = {
    meta: { name: '@delba/eslint', version: '1.0.0' },
    rules,
};
export default plugin;
