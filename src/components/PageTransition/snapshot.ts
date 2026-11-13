/** WAAPI lowercases unescaped pseudo-element identifiers in Chromium. Escape capitals
 * as code points so the selector keeps the case-sensitive React snapshot name. */
export function snapshotSelector(phase: 'old' | 'new', name: string): string {
    const escaped = CSS.escape(name).replace(/[A-Z]/g, character =>
        `\\${character.charCodeAt(0).toString(16)} `);
    return `::view-transition-${phase}(${escaped})`;
}
