# SwitchButton

Статус: текущий договор; сверено с реализацией. Проверки — по критериям ниже и общей приёмке библиотеки.

## Назначение и применение

Переключатель булевой настройки с бегунком, построенный на нативном checkbox.
Используй проектный D*-компонент для закреплённого оформления настройки;
для списка независимых выбираемых пунктов подходит Checkbox.

## Основной API

- `checked` + `onChange(event)`; следующее значение — `event.currentTarget.checked`.
- `defaultChecked` — неуправляемый старт; `disabled`, `name`, `value`, `required`
  передаются нативному input. Компонент сам назначает `type='checkbox'`.
- `children` — подпись, `gap` по умолчанию `[8,8,8]`.
- `ref` — HTMLInputElement, `className`/`style` — корневая label.
- Отступы, `grow`, `state`, `linkState` и общие motion-props дополняют оформление.
  Отдельных `variant`, `size`, `onValueChange` в собственном API нет.

## Пример

Клиентский компонент; сохранение настройки организует приложение:

```tsx
'use client';
import { useState } from 'react';
import { SwitchButton } from '@delba/ui';

export function PreviewSetting() {
  const [enabled, setEnabled] = useState(false);
  return <SwitchButton checked={enabled}
    onChange={(event) => setEnabled(event.currentTarget.checked)}>
    Показывать предпросмотр
  </SwitchButton>;
}
```

## Состояния и ограничения

Checked — модель настройки, не состояние запроса сохранения. Компонент не делает
API-запрос и не гарантирует серверный результат. DOM-семантика — checkbox;
не приписывай ему несуществующий собственный role switch или другую сигнатуру события.
Если действие требует ожидания, его состояние и обратную связь задаёт приложение.

## Устройство и владельцы

Компонент соединяет нативный checkbox, Flex-дорожку и декоративный бегунок.
Checked, клавиатура и form.reset принадлежат браузеру; отдельного React-store
нет. Общий useSharedMotion получает корневую label напрямую, внешний ref
остаётся на input. Маркер `SwitchButton` и собственный SCSS назначаются
существующему корню, без дополнительной обёртки.

## Приёмка изменения

- Space и клик по подписи меняют checked; disabled блокирует ввод.
- Бегунок соответствует checked, фокус виден и ref указывает на input.
- Name/value в форме и вариант с длинной подписью проверены на mobile.

[API и реализация](../../../../src/components/SwitchButton/SwitchButton.tsx) ·
[Checkbox](Checkbox.md) · [Приёмка](../../verification/acceptance.md)
