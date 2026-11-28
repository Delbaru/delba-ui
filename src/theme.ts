import { FRONTEND_THEME } from './core/theme.generated';
import { fillClass, borderClass, textClass } from './skin/index';

export type FontName = (typeof FRONTEND_THEME.fonts)[number];
export type Fill = keyof typeof FRONTEND_THEME.colors;
export type TextColor = Fill;
export type IconColor = Fill;
export type Border = 'none' | keyof typeof FRONTEND_THEME.geometry.lines;
export type Radius = keyof typeof FRONTEND_THEME.geometry.radii;
export type Size = keyof typeof FRONTEND_THEME.geometry.padding;
export type Pad = number | readonly [number, number] | readonly [number, number, number, number];

/** Sparse generated theme dictionaries and typed selectors, owned by one application config. */
export const theme = {
    fills: FRONTEND_THEME.colors,
    texts: FRONTEND_THEME.colors,
    iconColors: FRONTEND_THEME.colors,
    lines: FRONTEND_THEME.geometry.lines,
    radii: FRONTEND_THEME.geometry.radii,
    paddingValues: FRONTEND_THEME.geometry.padding,
    fillNames: Object.keys(FRONTEND_THEME.colors) as Fill[],
    textNames: Object.keys(FRONTEND_THEME.colors) as TextColor[],
    iconNames: Object.keys(FRONTEND_THEME.colors) as IconColor[],
    borderNames: ['none', ...Object.keys(FRONTEND_THEME.geometry.lines)] as Border[],
    radiusNames: Object.keys(FRONTEND_THEME.geometry.radii) as Radius[],
    paddingNames: Object.keys(FRONTEND_THEME.geometry.padding) as Size[],
    padding: (name: Size): Pad => FRONTEND_THEME.geometry.padding[name],
    radius: (name: Radius): number => FRONTEND_THEME.geometry.radii[name],
    fillClass: (name: Fill): string => fillClass(name),
    borderClass: (name: Exclude<Border, 'none'>): string => borderClass(name),
    textClass: (name: TextColor): string => textClass(name),
};
