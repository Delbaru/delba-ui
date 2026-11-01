# Textarea

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Многострочный обычный текст с подписью, проверкой и счётчиком.
Используй проектную D*-композицию для повторяемого оформления.
Форматируемый документ относится к LexicalTextarea, а не к этому полю.

## Основной API

- `value`/`defaultValue`; `onValueChange(value, details)` возвращает модель,
  `onChange(event)` — настоящее событие textarea.
- `rows=3`, `loading=false`; `label`, `placeholder`, `comment`, `error`.
- `variant`: `primary`/`secondary`; `size`: `default`/`fullWidth`.
  Resolver по умолчанию выбирает `primary`, размер `default` без явной геометрии.
- `length.min/max`, `required`, `validate(value)`, `seed`.
- `showCount` по умолчанию включается при `length.max`;
  `countPlacement='inside'`, доступно `below`.
- `field` оформляет нативное поле, `fieldClassName` — внутреннюю поверхность;
  обычный `className` относится к корню с подписью. Ref — HTMLTextAreaElement.

## Пример

Клиентский компонент с моделью строки:

```tsx
'use client';
import { useState } from 'react';
import { Textarea } from '@delba/ui';

export function CommentField() {
  const [comment, setComment] = useState('');
  return <Textarea label="Комментарий" value={comment}
    onValueChange={setComment} length={{ max: 500 }} countPlacement="below" />;
}
```

## Состояния и ограничения

Loading заменяет ввод скелетоном; `rows` определяет число его строк.
Ошибка перекрывает комментарий и освобождает ввод при фокусе.
`seed` изменяет модель при focus/blur; `maxLength` нативного поля берётся из `length.max`.
Если включить счётчик без максимума, подпись использует знаменатель `1000` —
это отображение, а не автоматически назначенный лимит ввода.

## Приёмка изменения

- Ввод, seed и ошибки сохраняют модель, фокус и ref.
- Счётчик не перекрывает длинный текст; loading сохраняет геометрию поля.
- Подпись и ошибка доступны с клавиатуры/через aria-связи.

[API и реализация](../../../../src/components/Textarea/Textarea.tsx) ·
[LexicalTextarea](LexicalTextarea.md) · [Приёмка](../../verification/acceptance.md)
