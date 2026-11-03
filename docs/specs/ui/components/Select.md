# Select

Статус: текущий договор; сверено с реализацией. Проверки — по критериям ниже и общей приёмке библиотеки.

## Назначение и применение

Выбор одного или нескольких значений из списка, включая группы вариантов.
Проектный DSelect закрепляет оформление; позиционирование, клавиатура и состояние
списка остаются у кита. Для короткого видимого выбора см. ChoiceButtons.

## Основной API

- `options`: `{ value, label, children?, selectedChildren? }` или группы `{ label, options }`.
- Одиночный режим: `value: T | null`, `onChange(value: T | null)`.
- `multiple=true`: `value: T[]`, `onChange(value: T[])`; `defaultValue` — неуправляемый режим.
- `closeOnSelect=false` влияет на multiple; одиночный выбор закрывает список.
  `showSelected=true`, `visibleOptions=4`, `loading=false`.
- `variant`: `primary`/`primaryFill`/`secondary`; `size`: `default`/`fullWidth`.
  Resolver задаёт `primary` и `default` без явной геометрии.
- `label`, `placeholder='Выберите значение'`, `error`, `required`, `validate`;
  `name` и `form` подключают значение к FormData.
- `panel` оформляет список, `collapse` сворачивает всё поле; ref указывает на
  фокусируемый div-триггер, а не на внешнюю оболочку FieldFrame.

## Пример

Клиентский компонент; callback принимает значение, не событие:

```tsx
'use client';
import { useState } from 'react';
import { Select } from '@delba/ui';

export function FormatField() {
  const [format, setFormat] = useState<string | null>(null);
  return <Select label="Формат" name="format" value={format} onChange={setFormat}
    options={[{ value: 'stl', label: 'STL' }, { value: 'obj', label: 'OBJ' }]} />;
}
```

## Состояния и ограничения

Loading сохраняет шеврон и блокирует раскрытие; disabled запрещает выбор.
Multiple отправляет несколько записей одного `name`. У каждого пункта нужен текстовый
`label`, даже при кастомной разметке. Управление open списка принадлежит Select.

## Приёмка изменения

- Стрелки/Enter/Escape, фокус и выбор работают в обеих ветках multiple.
- Loading/disabled не раскрывают список; FormData соответствует модели.
- Панель помещается во viewport, root collapse закрывает открытый список.

[API](../../../../src/components/Select/Select.tsx) · [Опции](../../../../src/components/Select/options.ts) ·
[ChoiceButtons](ChoiceButtons.md) · [Приёмка](../../verification/acceptance.md)

## Устройство и владельцы

Select.tsx собирает общий FieldFrame, Dropdown, SelectTrigger и SelectOptions. Публичные
типы находятся в Select.types.ts; входы пакета сохранены. useSelect хранит один
selection и popup-state и отдаёт предметные двери value, feedback, popup, focus,
trigger, motion. Нет списка из десятков извлечённых flags в JSX компонента.
options.resolveSelectCatalog за один проход согласует выбранные значения,
видимые варианты и групповые подписи. Навигация клавиатуры выражена реестром
команд; чистый moveSelectFocus задаёт wrap и пустой список.

SelectTrigger/ и SelectOptions/ имеют собственные TSX/SCSS и классы на прежних
корнях. Родительские стили не импортируются. Родитель передаёт оформление
через CSS variables, включая параметры портальной панели; дочерний модуль
владеет своими селекторами. Нет глобальных селекторов по имени соседа.

SelectTrigger сохраняет протокол Dropdown: ref, clone-events и aria props доходят
до существующего корня. aria-controls=listboxId виден Dropdown уже на элементе
trigger, а не только внутри функции-компонента. Внешние handlers и библиотечная
клавиатура компонуются; ни один обработчик не теряется при клонировании.
Значение → loading использует объект animate с when='change', effect='fade'.

ui.config.messages.select задаёт placeholder, required и selectedCount с {count}.
Явные placeholder/emptyMessage/renderValue сохраняют приоритет. Нативная
отправка hidden input, multiple, form/reset и отказ выбора disabled/loading сохранены.

### Общая презентация поля

FieldFrame владеет подписью, декоративной звёздочкой и нижним сообщением.
useFieldFeedback согласует приоритет ошибки/комментария и aria-describedby;
входной aria-describedby дополняется ID фактически показанного сообщения.
Во время loading скелет заменяет внутреннюю ошибку, поэтому её ID не попадает
в aria-describedby до появления самого сообщения.
SelectTrigger рисует только внутреннюю ошибку и содержимое выбора. Строки и
пользовательская разметка выбранного значения/опций проходят через один
selectContent.render; дополнительных визуальных обёрток этот помощник не создаёт.

У div-триггера нет нативного label htmlFor. FieldFrame рисует его подпись как
span с ID и activate; триггер ссылается на неё через aria-labelledby, а нажатие
подписи фокусирует тот же узел, на который указывает публичный ref. Явный
aria-label имеет приоритет. Нативные Input/Textarea продолжают использовать label.

Selection имеет один uncontrolled state и одну подписку useFormReset.
Select не вызывает текстовый useFieldControl ради ID/ref/ошибки: иначе тот
создаёт неиспользуемый string-state и вторую reset-подписку. Валидация значения
остаётся у Select, поскольку одиночный и множественный выбор имеют разные типы.

Проверки: SSR доступное имя и единственный ID сообщения; браузерный клик по
подписи и правильный ref; нативный reset/cancel reset, внешняя form=, grouped
multiple, disabled/loading и Select в портальном Modal.
