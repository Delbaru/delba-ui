/** The same easing preset is callable in JS and exposes its CSS representation. */
export type Easing = (progress: number) => number;
function preset<N extends string>(key: N, curve: Easing, css: string) {
    return Object.assign(curve, { key, css });
}
function sampledCss(curve: Easing): string {
    return `linear(${Array.from({ length: 101 }, (_, index) => Number(curve(index / 100).toFixed(6))).join(', ')})`;
}
function sampled<N extends string>(key: N, curve: Easing) {
    return preset(key, curve, sampledCss(curve));
}
function bezier<N extends string>(
    key: N,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    css?: string,
) {
    const point = (t: number, a: number, b: number) =>
        3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    return Object.assign(
        preset(
            key,
            (progress: number) => {
                if (progress <= 0 || progress >= 1) return Math.max(0, Math.min(1, progress));
                let low = 0;
                let high = 1;
                for (let index = 0; index < 24; index++) {
                    const middle = (low + high) / 2;
                    if (point(middle, x1, x2) < progress) low = middle;
                    else high = middle;
                }
                return point((low + high) / 2, y1, y2);
            },
            css ?? `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
        ),
        { points: [x1, y1, x2, y2] as const },
    );
}
/** Advanced configuration only: the serializable control points drive both CSS and JS. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
    if (![x1, y1, x2, y2].every(Number.isFinite) || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1)
        throw new Error('Invalid cubic-bezier control points');
    return bezier('custom', x1, y1, x2, y2);
}
export const motionEasing = {
    linear: preset('linear', (t: number) => t, 'linear'),
    ease: bezier('ease', 0.25, 0.1, 0.25, 1, 'ease'),
    easeIn: bezier('easeIn', 0.42, 0, 1, 1, 'ease-in'),
    easeOut: bezier('easeOut', 0, 0, 0.58, 1, 'ease-out'),
    easeInOut: bezier('easeInOut', 0.42, 0, 0.58, 1, 'ease-in-out'),
    soft: bezier('soft', 0.309, 0.112, 0, 1),
    out: bezier('out', 0.16, 1, 0.3, 1),
    smooth: bezier('smooth', 0.22, 0.61, 0.36, 1),
    symmetric: bezier('symmetric', 0.45, 0, 0.55, 1),
    back: bezier('back', 0.34, 1.56, 0.64, 1),
    spring: bezier('spring', 0.34, 1.3, 0.64, 1),
    veil: bezier('veil', 0.55, 0, 1, 0.45),
    easeInCubic: sampled('easeInCubic', (t) => t ** 3),
    easeOutCubic: sampled('easeOutCubic', (t) => 1 - (1 - t) ** 3),
    easeInOutCubic: sampled('easeInOutCubic', (t) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,),
    easeOutQuart: sampled('easeOutQuart', (t) => 1 - (1 - t) ** 4),
    easeOutExpo: sampled('easeOutExpo', (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))),
};
export type MotionEasingName = keyof typeof motionEasing;
export type MotionEasingPreset =
    | (typeof motionEasing)[MotionEasingName]
    | ReturnType<typeof cubicBezier>;
export type SerializedEasing = MotionEasingName | readonly [number, number, number, number];
export const DEFAULT_EASING_ROLES = {
    linear: 'linear',
    ease: 'ease',
    'ease-in-out': 'easeInOut',
    'cubic-bezier': 'soft',
    out: 'out',
    default: 'smooth',
    symmetric: 'symmetric',
    back: 'back',
    spring: 'spring',
    veil: 'veil',
    counter: 'easeOutQuart',
} as const satisfies Record<string, MotionEasingName>;
export type MotionEasingRole = keyof typeof DEFAULT_EASING_ROLES;
export type MotionEasingOverrides = Partial<
    Record<MotionEasingRole, MotionEasingName | MotionEasingPreset>
>;
export function easingPresetName(value: unknown): SerializedEasing | null {
    if (typeof value === 'string' && Object.hasOwn(motionEasing, value))
        return value as MotionEasingName;
    if (typeof value === 'function') {
        const known = (Object.keys(motionEasing) as MotionEasingName[]).find(
            (key) => motionEasing[key] === value,
        );
        if (known) return known;
        // CLI can load the config through tsx CJS and this generator through ESM: identities differ.
        const declaredKey: unknown = 'key' in value ? value.key : undefined;
        const css: unknown = 'css' in value ? value.css : undefined;
        if (
            typeof declaredKey === 'string' &&
            Object.hasOwn(motionEasing, declaredKey) &&
            motionEasing[declaredKey as MotionEasingName].css === css
        )
            return declaredKey as MotionEasingName;
        const points: unknown = 'points' in value ? value.points : undefined;
        if (
            Array.isArray(points) &&
            points.length === 4 &&
            points.every((point) => typeof point === 'number' && Number.isFinite(point))
        ) {
            const [x1, y1, x2, y2] = points as [number, number, number, number];
            cubicBezier(x1, y1, x2, y2);
            return [x1, y1, x2, y2];
        }
    }
    return null;
}
export const resolveEasingPreset = (value: SerializedEasing): MotionEasingPreset =>
    typeof value === 'string' ? motionEasing[value] : cubicBezier(...value);
