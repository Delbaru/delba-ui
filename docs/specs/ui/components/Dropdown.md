# Dropdown

Выпадающая поверхность для меню, формы и календаря возле реального якоря.
Проект задаёт оформление, Dropdown владеет открытием и lifecycle поверхности.

## Публичный договор

| Проп | Договор |
|---|---|
| trigger / anchorRef / point | Взаимоисключающие варианты: React-trigger, DOM-якорь или viewport-точка |
| open + onOpenChange | Controlled-состояние, callback обязателен |
| defaultOpen | Uncontrolled-состояние, начально false |
| children | Узлы либо функция (close) => ReactNode |
| panel | Оформление и геометрия поверхности |
| keyboard | menu по умолчанию; content оставляет стрелки содержимому |
| focusRegions | Дополнительные логические области фокуса, не pointer-inside |
| initialFocus | first/last при controlled-открытии; без значения фокус сохраняется |
| preserveFocus | Сохранять фокус поля при pointer-действии внутри поверхности |
| returnFocus | Ref возврата после подтверждённого закрытия либо false |
| surfaceRef | Ref настоящей окрашенной поверхности |
| closeOn | blur/escape по умолчанию true |
| blockOutsideClick | Закрывающий клик не активирует фон, по умолчанию false |
| backdrop | Необязательная не фокусируемая подложка |

panel defaults: side=start, offset=8 дизайн-единиц, matchTriggerWidth=false,
keepMounted=true, viewportPadding=8 CSS px. portal=false с trigger и true с внешним
anchorRef и point. panel.anchorRef меняет геометрию trigger-сценария, сохраняя его клавиатуру.
panel.strategy=document прокручивает портал вместе со страницей и использует --z-anchored;
fixed удерживает панель в окне. Закреплённый якорь и point используют fixed автоматически.
InputCalendar явно выбирает fixed, сохраняя календарь в доступной области окна.
Внешний anchorRef не создаёт trigger или дополнительную корневую обёртку.
inheritVariables переносит выбранные CSS-переменные в портал.

onOpenChange вторым аргументом сообщает outside/blur/escape/trigger/content/disabled.
Существующий callback с одним аргументом совместим. Callback запрашивает переход;
при controlled-отказе панель остаётся открытой. Дети получают close без аргументов.

## Меню

```tsx
<Dropdown trigger={<Button>Действия</Button>} panel={{ portal: true }}>
  {(close) => <Button onClick={close}>Закрыть</Button>}
</Dropdown>
```

Исходный click выполняется первым, preventDefault отменяет переключение.
Disabled-trigger не открывается. Tab входит в панель, стрелки/Home/End перемещают
фокус между доступными пунктами, не нарушая ввод в полях. Escape закрывает слой,
ссылка закрывает меню. Закрытая панель inert и aria-hidden.

## Календарь и внешний якорь

```tsx
<Dropdown
    anchorRef={fieldRef}
    open={open}
    onOpenChange={setOpen}
    keyboard="content"
    preserveFocus
    panel={{ portal: true, strategy: 'fixed', animate: { when: 'open', effect: 'fade', duration: 'fast' } }}
>
  <Calendar value={value} onValueChange={setValue} />
</Dropdown>
```

InputCalendar использует этот вариант и переводит значение Calendar в модель поля.
Он не создаёт второй createPortal/useFloatingSurface. Calendar остаётся inline;
его стрелки принадлежат Calendar, Escape поверхности — Dropdown.

## Внутренние границы

Dropdown.model соединяет единственного владельца open, trigger, shared floating
surface и возврат фокуса. Dropdown.keyboard — чистая политика команд меню,
Dropdown.layout — inline-координаты и наследование токенов темы. Портал позиционирует
useFloatingSurface, без второго движка. DropdownPanel и DropdownBackdrop имеют
свои именованные папки и SCSS. Фокусные регионы не расширяют pointer-inside:
внешний клик проверяется по trigger/anchor и окрашенной поверхности.

## Приёмка

Проверь trigger и внешний anchor, controlled-отказ, Tab/стрелки/Escape,
возврат фокуса, внешний клик и вложенные Dropdown. Отдельно проверь календарные
стрелки, портал внутри Modal, viewport edge, keepMounted=false, быстрый reopen,
reduced motion и пользовательские отменённые события. Playwright выполняется
после завершения всей миграции DelbaUI.

Источник: [Dropdown.tsx](../../../../src/components/Dropdown/Dropdown.tsx).

Точечное меню использует `point={{ x, y, target }}` и `initialFocus="first"`.
Реальный target задаёт документ, модальный портал и возврат фокуса; без target
используется body текущего документа. `point={null}` допустим для закрытого меню.
Target точечного меню не считается pointer-inside: клик по нему закрывает меню.
При Escape цель возврата сохраняется до подтверждённого закрытия, включая
одновременные `point={null}` и удаление сфокусированного содержимого. Внешний
клик и уход фокуса сохраняют выбранный пользователем фокус; отказ controlled-владельца
закрыть меню не возвращает фокус к opener.

Точечная панель остаётся внутри ближайшего dialog, включая контейнер с transform.
Общий positioner переводит координаты окна в содержащий fixed-блок и ограничивает
панель его краями. Point размещается с clamp возле курсора; обычные anchor панели
сохраняют выбор стороны. Вход, стрелки и возврат фокуса используют preventScroll;
unmount открытой панели возвращает фокус только когда она им владела.

`panel.boundaryRef?: RefObject<HTMLElement | null>` явно задаёт поверхность-владельца
портала и границы fixed-позиционирования. Это необходимо для немодальных окон
с role=region/tabpanel: роль не заменяется на dialog ради выбора портала.
Потребитель передаёт реальный DOM ref; kit не знает проектных selectors.
Без boundaryRef сохраняется автоматический modal/document host. Clamp к границе
независим от преобразования координат transformed containing block; оба выполняет
общий useAnchoredFloating. Keyboard/outside dismissal и возврат focus остаются
у Dropdown, второй portal/positioner потребителю не нужен.
