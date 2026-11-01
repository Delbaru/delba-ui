# LexicalTextarea

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Редактор форматированного текста Lexical со списками, ссылками и переменными.
Экспорт называется LexicalTextarea, папка реализации — RichTextarea.
Проектная D*-композиция задаёт назначение, тему и разрешённые возможности;
для обычного текста используй Textarea.

## Основной API

- `content` — сериализованный документ или строка; синхронизация внешнего содержимого
  отличается от нативного controlled value текстового поля.
- `onChange(payload)` получает `{ json, plainText, characters, isEmpty }`, не DOM-событие.
- `variant='style-1'`; доступны `default`, `plain`, `style-1`…`style-5`.
- `variables=[]`, `allowLink=true`; `label`, `placeholder`, `comment`, `error`.
- `minLength`, `maxLength`, `required`, `validate(payload)`; лимиты проверяют содержимое.
- `ref` — LexicalTextareaHandle: `focus`, `reset`, `setContent`, `insertVariable`, `getValue`.
  Это ручка редактора, не HTMLElement. `collapse` сворачивает поле целиком.

## Пример

Клиентский компонент с установленными Lexical peer-зависимостями кита:

```tsx
'use client';
import { useState } from 'react';
import { LexicalTextarea, type LexicalTextareaChangePayload } from '@delba/ui';

export function DescriptionEditor() {
  const [draft, setDraft] = useState<LexicalTextareaChangePayload | null>(null);
  return <><LexicalTextarea label="Описание" content="Начальный текст"
    onChange={setDraft} maxLength={2000} />
    <output>{draft?.characters ?? 0}</output></>;
}
```

## Состояния и ограничения

Новая content-сигнатура синхронизирует документ без пользовательского onChange;
программные команды handle имеют собственный договор уведомления.
`maxLength` показывает ошибку превышения, а не нативное ограничение ввода.
`allowLink=false` скрывает кнопку ссылки в toolbar; это не серверная политика безопасности.
У компонента нет собственных disabled/loading/readOnly props; не обещай такие режимы.

## Приёмка изменения

- Ввод, форматирование, undo/redo и внешняя синхронизация не теряют документ/фокус.
- Переменные и разрешённые ссылки, payload, ошибки длины и ref-команды проверены.
- Toolbar доступен с клавиатуры; содержимое безопасно обрабатывается при публикации.

[API](../../../../src/components/RichTextarea/LexicalTextarea.tsx) · [Payload и handle](../../../../src/components/RichTextarea/types.ts) ·
[Синхронизация](../../../../src/components/RichTextarea/useLexicalTextarea.ts) · [Textarea](Textarea.md) · [Приёмка](../../verification/acceptance.md)
