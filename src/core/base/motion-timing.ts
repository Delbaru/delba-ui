/** Pure timing names shared by runtime and the generator, without generated config. */
export function isMotionTimingName(value: unknown): value is string {
    return typeof value === 'string' && /^[a-z][A-Za-z0-9]*$/.test(value);
}

/** CSS-договор прежних длительностей: camelCase в API, kebab-case в CSS. */
export function motionTimingVariable(name: string): string {
    return `--t-d-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

