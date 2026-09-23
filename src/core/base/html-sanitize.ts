/**
 * Санитайзер пользовательского rich-text (HTML из Lexical-редактора). Вынесен из html-utils в
 * отдельный модуль, чтобы тяжёлый DOMPurify (isomorphic-dompurify → jsdom на SSR) НЕ попадал в
 * общий чанк через html-utils, который тянет вездесущий Text (decode/clamp-хелперы). Теперь DOMPurify
 * подтягивается только там, где реально рендерится rich-text (RichText), а не на каждом экране.
 *
 * isomorphic-dompurify оставлен намеренно: rich-text может рендериться на сервере, и он безопасен в SSR.
 */
import DOMPurify from 'isomorphic-dompurify';

const RICH_TEXT_ALLOWED_TAGS = [
  'a',
  'b',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'mark',
  'ol',
  'p',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
] as const;

const RICH_TEXT_ALLOWED_ATTR = ['href', 'rel', 'target', 'title'] as const;

// Расширенный набор для Markdown-ответов (GFM из `marked`): блок кода, таблицы, цитата, черта,
// зачёркнутое. Отдельной опцией, а не в общий список: умолчание у потребителей кита не должно
// поменяться ни на байт. `align` — им `marked` размечает выравнивание колонок таблицы.
const RICH_TEXT_EXTRA_TAGS = [
  'pre',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'blockquote',
  'hr',
  'del',
  's',
] as const;

const RICH_TEXT_EXTRA_ATTR = ['align'] as const;

/** Опции `sanitizeRichTextHtml`. */
export interface SanitizeRichTextOptions {
  /**
   * Расширенный набор разметки — для HTML из Markdown (GFM): дополнительно пропускает `pre`,
   * `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `blockquote`, `hr`, `del`, `s` и атрибут
   * `align`. Скрипты, обработчики `on*` и `javascript:`-ссылки режутся так же, как без опции.
   * По умолчанию `false` — прежний набор тегов пользовательского rich-text.
   */
  rich?: boolean;
}

/**
 * Чистит HTML rich-text по белому списку тегов и атрибутов (DOMPurify, безопасно в SSR).
 * @param value — исходный HTML.
 * @param options — `{ rich: true }` расширяет набор под Markdown-ответы (таблицы, `pre`, цитаты).
 */
export const sanitizeRichTextHtml = (value: string, options?: SanitizeRichTextOptions): string =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS: options?.rich ? [...RICH_TEXT_ALLOWED_TAGS, ...RICH_TEXT_EXTRA_TAGS] : [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: options?.rich ? [...RICH_TEXT_ALLOWED_ATTR, ...RICH_TEXT_EXTRA_ATTR] : [...RICH_TEXT_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
  });
