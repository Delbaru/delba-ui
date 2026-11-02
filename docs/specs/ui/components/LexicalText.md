# LexicalText

Текущий договор, сверенный по исходнику; runtime-проверка отдельно.

## Назначение и применение

Вывод редакторского контента: HTML или документа Lexical. Публичное имя — `LexicalText`; папка реализации называется `RichText`. Для обычной подписи или заголовка используй [Text](Text.md), для редактирования — [LexicalTextarea](LexicalTextarea.md).

## Основной API

- `content?: string | LexicalDocument | null` — вход; документ содержит `root.children`. Неизвестные узлы проверяет renderer; пустое содержимое не создаёт содержательный блок.
- `variant` по умолчанию `default` на всех полосах; допустимые варианты определены в исходном типе, это не произвольное имя варианта Text.
- HTML проходит санитайзер; содержание и права публикации всё равно проверяет система-владелец данных.
- `links?: 'active' | 'text'` defaults to `active`. Use `text` when a parent already owns the anchor: inline links and autolinks keep their children and formatting but render without nested anchors. Sanitized legacy HTML anchors are unwrapped the same way.
- В строковом HTML вложенные `ul`/`ol` сохраняют вложенные `li`; соседние блоки после списка не теряются.
- `rows`, `ellipsis`, `color`, общая геометрия, `animate` и `reveal` оформляют блок. Ссылки и структура внутри документа не должны терять смысл из-за обрезки.
- Санитайзер и роли без React доступны из `@delba/ui/rich-text`; сам компонент импортируется из `@delba/ui`.

## Пример

```tsx
import { LexicalText } from '@delba/ui';

export function LexicalTextExample() {
  return <LexicalText content="<p>Срок изготовления зависит от размера детали.</p>" />;
}
```

## Приёмка

Проверь HTML и JSON отдельно: пустой вход, вложенные списки, заголовки, ссылки, неизвестный узел, опасную HTML-вставку и длинный текст. Варианты и переносы проверяются по реальной теме. Смена формата входа не должна нарушать React lifecycle; reduced motion сохраняет доступный контент.

[LexicalTextProps и реализация](../../../../src/components/RichText/RichText.tsx) · [HTML-парсер](../../../../src/components/RichText/legacy-html.ts) · [документ](../../../../src/components/RichText/types.ts) · [приёмка](../../verification/acceptance.md).
