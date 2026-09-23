export { LexicalText, type LexicalTextProps, type LexicalTextVariant } from './RichText';
export { RICH_ROLES, isRichRole, resolveRole, roleClassKeys, isTextVariantName, tagDefaultRole, textVariantClasses, type RichRole, type RichTag } from './roles';

/**
 * Классы CSS-модуля `RichText`: корень `RichText`, роли блока `role-*`, `role-m-*`, `role-t-*`.
 *
 * Для редактора, который рисует контент сам (Lexical в CMS): он вешает на свои узлы те же
 * классы, что рендер, и блок в поле ввода выглядит как на сайте. Атрибут
 * `data-device="mobile" | "tablet"` на узле с классом `RichText` включает роли полосы без
 * медиазапроса — превью устройства при любой ширине окна.
 */
export { default as richTextClasses } from './RichText.module.scss';
