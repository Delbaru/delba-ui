import { FRONTEND_THEME } from '../theme.generated';

export const FONT_NAMES = FRONTEND_THEME.fonts;
export const TEXT_VARIANTS = FRONTEND_THEME.typography;
export const TEXT_ROLES = { body: 'body', caption: 'caption', micro: 'micro' } as const;
export type TextRole = keyof typeof TEXT_ROLES;
export type TextVariantName = (typeof TEXT_VARIANTS)[number];
export const textToken = (name: string): string => name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
export const isTextRole = (name: string): name is TextRole => Object.prototype.hasOwnProperty.call(TEXT_ROLES, name);
export const TYPOGRAPHY_FIELDS = FRONTEND_THEME.typographyFields;
