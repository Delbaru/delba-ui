# LexicalText

Статус: реализованный API; типы и unit проверяются отдельно от итоговой браузерной приёмки.

## Назначение

Безопасный вывод HTML или сериализованного документа Lexical. Для обычной подписи
используй Text, для редактирования — LexicalTextarea. Папка реализации называется RichText;
публичное имя LexicalText сохраняется.

## Договор

- content — HTML-строка, LexicalDocument, null или undefined. Пустой вход не создаёт блок.
  HTML проходит прежний санитайзер; неизвестные JSON-узлы отбрасываются с сохранением соседей.
- variant — default, plain, style-1…style-5; полный responsive-кортеж, по умолчанию default.
  plain наследует шрифт окружения; явно заданные роли блоков продолжают действовать.
- rows задаёт plain-text preview с ограничением строк. ellipsis без rows даёт одну строку.
  Полный документ остаётся источником данных; сокращённый текст не возвращается в CMS.
- links='active' сохраняет ссылки. links='text' оставляет содержание без вложенных anchor.
- Общие layout-пропсы, color, linkState, reveal, perspective3d и parallax сохраняют
  общий договор Box. Пользовательские DOM-события компонуются его механизмом.
- Класс LexicalText остаётся на существующем корне; собственный SCSS — LexicalText.module.scss.
  Прежний RichText-класс и экспорт richTextClasses сохранены как публичный договор типографики.

## Применение

```tsx
import { LexicalText } from '@delba/ui';

export function Description({ html }: { html: string }) {
  return <LexicalText content={html} links="text" rows={[4, 6, 4]} />;
}
```

Новый код задаёт анимацию объектом. Появление использует общий animate с when='load'
или when='inView'. Последовательность HTML выбирается явно:

```tsx
import { LexicalText } from '@delba/ui';

export function DeliveryStep({ step }: { step: number }) {
  return <LexicalText animate={{
    when: 'change', effect: 'textSlide', currentStep: step,
    steps: ['<p>Заказ принят</p>', '<p>Заказ отправлен</p>'], duration: 'fast',
  }} />;
}
```

textClip поддерживает тот же выбор steps/currentStep и необязательный clipHeight.
Длительность — MotionTime, секунды или имя времени. Последовательности применяются к HTML;
JSON выводится как документ. Старый public animation помечен deprecated и декодируется
только на входе в тот же контракт последовательности; второго движка нет.
Прежнее значение counter не создавало счётчик в RichText и не получает нового поведения.

Повторявшиеся стили вариантов сведены в один rich-preset Sass-рецепт с именованными
различиями пресетов. Итоговый compressed CSS сверен до/после побайтно: типографика
и каскад сохранены, исходный SCSS сокращён без удаления поддерживаемых вариантов.

## Владельцы

- LexicalText собирает Box, preview или RichTextSequence.
- useRichText разрешает responsive-вариант, контент и выбор sequence/appearance.
- RichText.content и LexicalRenderer отвечают за безопасную структуру и роли.
  Renderer — чистая функция без собственной визуальной оболочки; получает классы владельца.
- RichTextSequence имеет свою папку/SCSS и владеет измерением высот, ResizeObserver,
  смещением шагов и отменой таймеров clip. Роли и санитайзер не копируются.
- Reduced motion отключает переходы и сразу выбирает нужный clip-шаг.

## Приёмка

Проверить HTML и JSON, вложенные списки, неизвестные узлы, опасный HTML, ссылки
и режим links=text, clamp/ellipsis, responsive-роли, смену HTML↔JSON.
Для sequence: разные высоты, загрузку шрифта/resize, быстрый новый шаг,
отмену таймеров при unmount и reduced motion. Браузер выполняется в общем финальном gate.

[Композиция](../../../../src/components/RichText/RichText.tsx) ·
[Типы](../../../../src/components/RichText/RichText.types.ts) ·
[HTML-парсер](../../../../src/components/RichText/legacy-html.ts) ·
[Документ](../../../../src/components/RichText/types.ts).
