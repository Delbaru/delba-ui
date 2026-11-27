# Button

Статус: текущий договор; сверено с реализацией. Проверки — по критериям ниже и общей приёмке библиотеки.

## Назначение и применение

Действие или переход с общей обработкой событий, refs и движения.
На экранах используй готовый проектный DButton, если он задаёт нужные скин,
размер и пресеты. Сам Button — публичная основа такой композиции, без продуктовых текстов.

## Основной API

- Без `href` рендерит кнопку; `type` по умолчанию `button`.
- `href` выбирает ссылку; `newTab`, `target`, `rel`, `download` уточняют переход.
- `variant`: `primary`, `secondary`, `secondaryFill`, `tertiary`;
  `size`: `small`, `medium`, `large`. В функции дефолты варианта/размера не назначаются.
- `disabled=false` блокирует действие; `onClick` получает событие.
- `onClick` может вернуть Promise: kit контролирует `loading`, reentry, ошибки и `onActionSettled` (`success`/`failed`/`cancelled`). Отказ с `name='AbortError'` означает отмену. Для RTK Query используйте `.unwrap()`.
- На уровне клиентского приложения один `ActionInvocationProvider(onFailure)` связывает ошибки с уведомлениями; успехи автоматически не всплывают. Без provider отказ логируется в консоль.
- `animate`, `collapse`, `tooltip={{ label, direction?, gap? }}`; направление по умолчанию `right`, отступ `8` px. Старые `tooltipDirection`, `tooltipGap` и `tooltip={ReactNode}` временно совместимы.
- `ref` указывает на фактический DOM-элемент; `className` и тема оформляют основу.

## Пример

В Next.js-приложении с подключённой темой и стилями кита:

```tsx
import { Button } from '@delba/frontend';

export function CatalogLink() {
  return <Button href="/catalog">Каталог</Button>;
}
```

## Состояния и ограничения

Действие и переход имеют разную семантику. Не вкладывай кнопки/ссылки друг в друга.
У disabled-ссылки блокируется навигация; tooltip не заменяет доступное имя.
Появление может сочетаться с hover/idle, сохраняя пользовательские обработчики.
Submit задаётся явно через `type="submit"` внутри формы.

## Устройство и владельцы

Публичные типы находятся в Button.types.ts. Сам Button выбирает нативный button,
anchor или Next Link, соединяет refs и последовательно добавляет взаимодействия
подсказки, движения, потребителя и prefetch через composeInteractionHandlers.
Disabled блокируется до пользовательского действия. Корень сохраняет `ui-button`
и получает узнаваемый `Button` с собственным SCSS.

`ButtonTooltip/ButtonTooltip.tsx` — только скин общей Tooltip с `as="span"`
и `surface={false}`. Позиционирование/видимость принадлежат useTooltip,
портал и переход — Tooltip; Button не содержит второй fade-движок.
Стабильные соседние позиции кнопки и портала сохраняют DOM при смене tooltip.

## Общий контроллер действия

[ActionInvocationProvider и useActionInvocation](ActionInvocationProvider.md) описывают полный договор.

`useActionInvocation<A>()` принимает любые аргументы действия, в том числе без аргументов
для Enter и click одного composer. `ActionInvocationProvider` принимает
`isCancelled?: (error:unknown)=>boolean` и `scopeKey?:string|number`;
по умолчанию AbortError, app различает `OsRequestError(kind='cancelled')`.
Ошибки onSettled/onFailure/predicate не блокируют pending; отказ отправляется
актуальному provider той же сессии даже после unmount потомка, но запрос за
пользователя kit не отменяет. Field errors — зона формы/app adapter.

## Приёмка изменения

- Клавиатура и клик выполняют одно нужное действие; disabled его не выполняет.
- `href` остаётся ссылкой, DOM ref и потребительские события работают.
- Tooltip и движение проверены с фокусом, reduced motion и закрытием/отменой.

[API и реализация](../../../../src/components/Button/Button.tsx) ·
[Движение](../motion.md) · [Приёмка](../../verification/acceptance.md)
