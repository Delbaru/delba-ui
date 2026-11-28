/** Disabled follows other states within each preset or explicit override tier. */
export const PRESET_STATES = [
    'hover',
    'focus',
    'focusWithin',
    'focusVisible',
    'active',
    'pressed',
    'checked',
    'open',
    'selected',
    'error',
    'disabled',
] as const;

export const PRESET_BANDS = ['d', 'm', 't'] as const;

/** These are ordinary style props without a native component-specific class builder. */
export const PRESET_STYLE_ONLY = [
    'opacity',
    'cursor',
    'overflow',
    'overflowX',
    'overflowY',
    'zIndex',
    'boxShadow',
] as const;

/** Visual configuration consumed by existing native multi-surface models, rather than CSS vars. */
export const PRESET_NATIVE_VISUAL = [
    'style',
    'variant',
    'size',
    'font',
    'fill',
    'stroke',
    'strokeWidth',
    'rotate',
    'field',
    'layout',
    'scroll',
    'rootStyle',
    'overlayStyle',
    'overflowVisible',
    'alignItems',
    'justifyContent',
    'rootW',
    'rootMinW',
    'rootMaxW',
    'rootH',
    'rootMinH',
    'rootMaxH',
    'rootR',
    'rootTLR',
    'rootTRR',
    'rootBRR',
    'rootBLR',
    'rootBg',
    'rootP',
    'rootPt',
    'rootPr',
    'rootPb',
    'rootPl',
    'rootM',
    'rootMt',
    'rootMr',
    'rootMb',
    'rootMl',
] as const;
