// Типографика принадлежит проекту, как цвета: набор вариантов объявляет он, кит только читает
// `--font-<имя>`, `--tt-<имя>`, `--ls-<имя>`. Своим компонентам кит берёт служебные роли.

declare global {
  /**
   * Варианты типографики проекта: `interface UiTypography { variants: 'h1' | 'p1' }` в его
   * глобальной декларации — и `Text variant` принимает только их. Не объявлен — прежний набор.
   */
  interface UiTypography {}
}

/** Набор проектов, которые своего не объявили: генератор печатает его целиком. */
export const LEGACY_TEXT_VARIANTS = ['numbers', 'numbersPlus', 'h1', 'h2', 'h3', 'h4', 'p1', 'p2', 'p3', 'subtitle', 'title', 'p', 'small', 'dop'] as const;

type LegacyVariant = Exclude<(typeof LEGACY_TEXT_VARIANTS)[number], 'numbers' | 'numbersPlus'>;

/**
 * Служебные роли кита → вариант, которым их набирала тема до ролей. Тема проекта связывает
 * роль со своим вариантом (`--font-caption: var(--font-p4)`); нет роли — фолбэк на прежний.
 *   body — текст полей, тостов, подписей элементов; caption — подписи и комментарии полей;
 *   micro — тултип, тайм-код, мелкие метки.
 */
export const TEXT_ROLES = { body: 'p', caption: 'small', micro: 'dop' } as const;

export type TextRole = keyof typeof TEXT_ROLES;

/** Вариант типографики проекта. */
export type TextVariantName = UiTypography extends { variants: infer V extends string } ? V : LegacyVariant;

/** Суффикс токенов варианта: `numbersPlus` → `numbers-plus`. */
export const textToken = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

// Не `Object.hasOwn`: у потребителей lib ниже es2022.
export const isTextRole = (name: string): name is TextRole => Object.prototype.hasOwnProperty.call(TEXT_ROLES, name);

/** Шрифт роли с фолбэком на прежний вариант: `var(--font-body, var(--font-p))`. */
export const roleFont = (role: TextRole): string => `var(--font-${role}, var(--font-${TEXT_ROLES[role]}))`;

/** Шрифт варианта или роли: `var(--font-h1)`, у роли — с фолбэком. */
export const textFont = (name: string): string => (isTextRole(name) ? roleFont(name) : `var(--font-${textToken(name)})`);
