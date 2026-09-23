// Вход `@delba/ui/rich-text`: роли и санитайзер rich-text без React и без SCSS — для node-скриптов
// и route handlers. Сюда — только модули без компонентов и стилей, их проверяет rich-text.test.ts.
export * from './components/RichText/roles';
export { sanitizeRichTextHtml } from './core/base/html-sanitize';
