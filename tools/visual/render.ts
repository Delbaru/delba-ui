import type { FrontendConfig } from '../config';
import { responsiveMedia, responsiveScaleCss } from '../../src/core/base/responsive-definition';
import { renderSkinAxes } from '../skin-axes';

export const tokenName = (name: string): string =>
    name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const rpx = (value: number) => `calc(${value} * var(--rpx))`;
const cssValue = (value: string | number) => (typeof value === 'number' ? rpx(value) : value);

export function colorValues(config: FrontendConfig): Record<string, string> {
    const values: Record<string, string> = {};
    const set = (name: string, value: string) => {
        if (Object.hasOwn(values, name)) throw new Error(`Duplicate generated color role ${name}`);
        values[name] = value;
    };
    for (const [role, value] of Object.entries(config.colors)) {
        if (typeof value === 'string') set(tokenName(role), value);
        else
            for (const [state, color] of Object.entries(value)) {
                set(`${tokenName(role)}${state === 'normal' ? '' : `-${state}`}`, color);
            }
    }
    return values;
}

/** Theme output is derived exclusively from the passed configuration. */
export function renderFrontendTheme(config: FrontendConfig, spacingValues: readonly number[] = []) {
    const media = responsiveMedia(config.responsive);
    const colors = colorValues(config);
    const root = new Map<string, string>();
    const set = (name: string, value: string) => {
        if (root.has(name)) throw new Error(`Duplicate generated theme variable --${name}`);
        root.set(name, value);
    };
    const fontCss: string[] = [];
    for (const name of Object.keys(config.motion.timing)) {
        set(`t-${tokenName(name)}`, `all var(--t-d-${tokenName(name)}) var(--t-t-f-ease)`);
    }
    for (const [role, font] of Object.entries(config.fonts)) {
        set(
            `font-family-${tokenName(role)}`,
            `'${font.family.replaceAll("'", "\\'")}', ${font.fallback}`,
        );
        for (const face of font.faces) {
            fontCss.push(`@font-face {
  font-family: '${font.family.replaceAll("'", "\\'")}';
  src: url('${face.src.replaceAll("'", "\\'")}');
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: ${face.display};
}`);
        }
    }
    for (const [role, value] of Object.entries(colors)) {
        if (!['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(value))
            set(role, value);
    }
    for (const [role, value] of Object.entries(config.gradients))
        set(`gradient-${tokenName(role)}`, value);
    const prefixes = {
        spaces: 's',
        dimensions: 'size',
        positions: 'position',
        radii: 'radius',
    } as const;
    for (const [group, prefix] of Object.entries(prefixes) as Array<
        [keyof typeof prefixes, string]
    >) {
        for (const [role, value] of Object.entries(config.geometry[group] ?? {}))
            set(`${prefix}-${tokenName(role)}`, rpx(value));
    }
    for (const value of spacingValues) {
        if (!Number.isSafeInteger(value) || value < 0 || value % 4 !== 0)
            throw new Error('Spacing tokens require nonnegative multiples of four RPX');
        set(`s-${value}`, rpx(value));
    }
    for (const [role, value] of Object.entries(config.geometry.padding)) {
        set(
            `padding-${tokenName(role)}`,
            Array.isArray(value) ? value.map(rpx).join(' ') : rpx(value as number),
        );
    }
    for (const [role, value] of Object.entries(config.geometry.shadows))
        set(`shadow-${tokenName(role)}`, value);
    const bandVariables: Record<'desktop' | 'mobile' | 'tablet', string[]> = {
        desktop: [],
        mobile: [],
        tablet: [],
    };
    const variableNames = new Set(root.keys());
    for (const [role, value] of Object.entries(config.variables)) {
        const name = tokenName(role);
        if (variableNames.has(name))
            throw new Error(`Duplicate generated theme variable --${name}`);
        variableNames.add(name);
        if (Array.isArray(value)) {
            (['desktop', 'mobile', 'tablet'] as const).forEach((band, index) => {
                const entry = value[index];
                if (entry !== null && entry !== undefined)
                    bandVariables[band].push(`  --${tokenName(role)}: ${cssValue(entry)};`);
            });
        } else set(tokenName(role), cssValue(value as string | number));
    }
    const typographyVariables: Record<'desktop' | 'mobile' | 'tablet', string[]> = {
        desktop: [],
        mobile: [],
        tablet: [],
    };
    const definedTypography: Record<string, Record<'desktop' | 'mobile' | 'tablet', string[]>> = {};
    const typographyNames = new Set<string>();
    for (const [role, typography] of Object.entries(config.typography)) {
        if (typographyNames.has(tokenName(role)))
            throw new Error(`Duplicate generated typography role ${role}`);
        typographyNames.add(tokenName(role));
        definedTypography[role] = { desktop: [], mobile: [], tablet: [] };
        (['desktop', 'mobile', 'tablet'] as const).forEach((band, index) => {
            const declarations = typographyVariables[band];
            const name = tokenName(role);
            const properties = {
                fontFamily: (value: string | number) =>
                    `var(--font-family-${tokenName(String(value))})`,
                fontSize: (value: string | number) => rpx(Number(value)),
                fontWeight: String,
                lineHeight: String,
                letterSpacing: (value: string | number) => rpx(Number(value)),
                textTransform: String,
            };
            for (const [field, format] of Object.entries(properties)) {
                const entry = typography[field as keyof typeof typography][index];
                if (entry !== null && entry !== undefined) {
                    declarations.push(`  --type-${name}-${tokenName(field)}: ${format(entry)};`);
                    definedTypography[role]?.[band].push(tokenName(field));
                }
            }
        });
    }
    const bands = (['desktop', 'mobile', 'tablet'] as const)
        .map(
            (band) =>
                `@media ${media[band]} {
:root {
${[...bandVariables[band], ...typographyVariables[band]].join('\n')}
}
}`,
        )
        .join('\n\n');
    const css = `/* AUTO-GENERATED by Frontend. */
${fontCss.join('\n\n')}

:root {
${[...root].map(([name, value]) => `  --${name}: ${value};`).join('\n')}
}
${responsiveScaleCss(config.responsive)}
${bands}
`;
    const references = Object.fromEntries(
        Object.entries(colors).map(([name, value]) => [
            name,
            ['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(value)
                ? value
                : `var(--${name})`,
        ]),
    );
    const axes = {
        fills: references,
        texts: references,
        lines: config.geometry.lines,
        maps: { 'icon-colors': references, shadows: config.geometry.shadows },
    };
    const skin = renderSkinAxes(axes);
    const runtime = `// AUTO-GENERATED by Frontend. Do not edit.
export const FRONTEND_THEME = ${JSON.stringify(
        {
            responsive: config.responsive,
            motionTiming: Object.keys(config.motion.timing),
            geometry: config.geometry,
            colors: references,
            typography: Object.keys(config.typography),
            typographyFields: definedTypography,
            fonts: Object.keys(config.fonts),
        },
        null,
        4,
    )} as const;
`;
    const preview = (['desktop', 'mobile', 'tablet'] as const)
        .map(
            (band) =>
                `  @if $device == '${band}' {
    --rpx: 1px;
${typographyVariables[band].join('\n')}
  }`,
        )
        .join('\n');
    const typographyMap = Object.entries(definedTypography)
        .map(
            ([role, bands]) =>
                `  '${role}': (${Object.entries(bands)
                    .map(
                        ([band, fields]) =>
                            `${band}: (${fields.map((field) => `'${field}'`).join(', ')}${fields.length === 1 ? ',' : ''})`,
                    )
                    .join(', ')})`,
        )
        .join(',\n');
    const typographyTokens = Object.keys(config.typography)
        .map((role) => `  '${role}': '${tokenName(role)}'`)
        .join(',\n');
    const typographyScss = `@use 'sass:map';
@use './responsive-generated' as responsive;

$typography-fields: (
${typographyMap}
);
$typography-tokens: (
${typographyTokens}
);

@mixin typography-device($device) {
${preview}
}

@mixin typography-role($role, $device: null) {
  $bands: map.get($typography-fields, '#{$role}');
  $token: map.get($typography-tokens, '#{$role}');
  $names: (desktop: d, mobile: m, tablet: t);
  @if $bands != null {
    @each $band, $fields in $bands {
      @if $device == $band {
        @each $field in $fields { #{$field}: var(--type-#{$token}-#{$field}); }
      } @else if $device == null {
        @media #{map.get(responsive.$breakpoints, map.get($names, $band))} {
          @each $field in $fields { #{$field}: var(--type-#{$token}-#{$field}); }
        }
      }
    }
  }
}

@mixin breakpoint($band) {
  $names: (desktop: d, mobile: m, tablet: t);
  $key: map.get($names, $band);
  @if $key == null { @error 'Unknown responsive band: #{$band}'; }
  @media #{map.get(responsive.$breakpoints, $key)} { @content; }
}
`;
    const breakpoints = `$breakpoints: (m: '${media.mobile}', t: '${media.tablet}', d: '${media.desktop}', n: '${media.below}');
`;
    return { css, runtime, skin, breakpoints, typographyScss };
}
