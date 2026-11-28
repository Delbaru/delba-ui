export interface ResponsiveBand {
    readonly minWidth: number;
    readonly designWidth: number;
    readonly scale: 'fixed' | 'fluid';
}
export interface ResponsiveDefinition {
    readonly mobile: ResponsiveBand;
    readonly tablet: ResponsiveBand;
    readonly desktop: ResponsiveBand & { readonly scaleLimit: number };
}

export function responsiveMedia(definition: ResponsiveDefinition) {
    return {
        mobile: `(max-width: ${definition.tablet.minWidth - 1}px)`,
        tablet: `(min-width: ${definition.tablet.minWidth}px) and (max-width: ${definition.desktop.minWidth - 1}px)`,
        desktop: `(min-width: ${definition.desktop.minWidth}px)`,
        below: `(max-width: ${definition.desktop.minWidth - 1}px)`,
        reducedMotion: '(prefers-reduced-motion: reduce)',
        touch: '(hover: none)',
    };
}

/** CSS and image sizing share the exact band definitions, including fixed RPX. */
export function responsiveScaleCss(definition: ResponsiveDefinition): string {
    const media = responsiveMedia(definition);
    return (['mobile', 'tablet', 'desktop'] as const).map(name => {
        const band = definition[name];
        const rpx = band.scale === 'fixed'
            ? '1px'
            : name === 'desktop'
              ? `min(calc(100vw / ${band.designWidth}), calc(${definition.desktop.scaleLimit}px / ${band.designWidth}))`
              : `calc(100vw / ${band.designWidth})`;
        return `@media ${media[name]} {\n  :root {\n    --base-width: ${band.designWidth};\n    --rpx: ${rpx};\n  }\n}\n`;
    }).join('\n');
}
