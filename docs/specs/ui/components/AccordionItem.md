# AccordionItem

Один именованный раздел [Accordion](Accordion.md): заголовок-кнопка и панель.
Используй внутри группы; отдельный AccordionItem без Accordion вызывает ошибку.
Оформление индикатора и поверхности принадлежит проектному компоненту.

## Основной договор

| Проп | Значение |
|---|---|
| `value` | Обязательный уникальный ключ пункта |
| `trigger` | Содержимое кнопки или объект с `content` и совместимыми пропсами кнопки |
| `children` | Содержимое панели |
| `headingAs` | Наследуется от Accordion, можно переопределить |
| `indicator` | Наследуется от Accordion; `null` убирает индикатор |
| `disabled` | Блокирует раскрытие и исключает пункт из навигации стрелками |
| `triggerProps` | Совместимые пропсы триггера; объект trigger при конфликте приоритетнее |
| `panelProps` | Раскладка и оформление панели; сворачивание управляется китом |

`ref` указывает на корневой элемент пункта. ID, ARIA-связи, onClick и disabled
кнопки принадлежат компоненту; triggerProps не заменяет этот механизм.

## Пример

```tsx
import { Accordion, AccordionItem } from '@delba/ui';

export function Details() {
  return <Accordion defaultValue="material">
    <AccordionItem
      value="material"
      trigger={{ content: 'Материал', w: ['100%', '100%', '100%'] }}
      panelProps={{ p: [16, 16, 16] }}
    >
      Характеристики выбранного материала.
    </AccordionItem>
    <AccordionItem value="later" trigger="Дополнительно" disabled />
  </Accordion>;
}
```

## Состояния и ограничения

Открытие хранится в Accordion, не в пункте. Токен `open` объединяется
с пользовательскими state пункта/триггера/панели.
Панель получает role=region и aria-labelledby; кнопка — aria-expanded/controls.
Не вкладывай самостоятельную кнопку или ссылку в триггер-кнопку.
Собственное collapse/animate панели не заменяет управление группы.

## Приёмка

Проверь совпадение ключа с выбранным значением, связи ID/ARIA и отсутствие
disabled-пункта в навигации. Убедись, что объект trigger сохраняет текст
и оформление, а быстрые переключения не оставляют панель в неверной фазе.

Источник: [Accordion.tsx](../../../../src/components/Accordion/Accordion.tsx),
[разбор trigger](../../../../src/components/Accordion/trigger-options.ts).
Сверка по исходникам; runtime-проверка здесь не заявлена.
