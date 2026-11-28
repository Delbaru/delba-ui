# Архитектура Frontend

`@delba/frontend` владеет UI-примитивами, общими механизмами и проекциями
[визуального конфига](configuration.md). Приложение владеет темой, D-ролями,
композицией экранов, данными, командами и правами. Потребитель обращается
к публичным входам пакета. Библиотека не импортирует исходники приложения.

## Композиция и оформление

Составной компонент использует существующие примитивы: например, Section —
`Flex as="section"`, ScrollArea — Flex с настройкой прокрутки. Нативный DOM
остаётся у владельца базового элемента или специального платформенного механизма.
Не повторяй в составном компоненте motion, refs и события уже готового примитива.

Композиция видна в JSX. Примитив предоставляет React API и DOM ref,
D-компонент задаёт проектную роль и пресеты, экран соединяет самостоятельные виджеты.
Выделяй именованные части по их ответственности. Локальное состояние остаётся
у владельца, пользовательские handlers и refs составляются с внутренними.
Обработчик учитывает `defaultPrevented` при выполнении собственного действия.

Поддержанные геометрию, раскладку, типографику, цвет, фон и рамки задавай
props или пресетом. Сверяй API и DOM, который получает результат.
Preset — типизированные визуальные props и states; его значения применяются
как defaults, явные props экземпляра имеют приоритет. Данные, refs, native
attributes и handlers передаёт вызов. Общий preset runtime принадлежит Frontend;
потребитель не собирает второй skin engine.
SCSS подходит для отсутствующего API и обоснованной сложной специфики.
Собственные селекторы вкладывай под корнем владельца по реальной DOM-иерархии.
Порталы и DOM чужих компонентов используют классы и props их владельцев.

Слой `ui.base` задаёт низкоприоритетные стили document и нативных элементов.
`ui.components`, `ui.utilities` и `ui.states` разделяют оформление компонентов,
props и состояния. Части используют общий рецепт ядра, если решают ту же задачу.
Runtime CSS компонента находится в его `*.module.scss`. Общие Sass-миксины
предоставляют рецепты, а глобальный CSS содержит тему, слои, utilities и правила
платформы, например document, scrollbar и snapshots переходов.
Для произвольных значений используй документированные props, inline style или
статическую карту. Динамически построенное имя utility-класса может отсутствовать
в извлекаемом CSS. Длины и адаптивность описывает [конфиг](configuration.md).
Состав файлов компонента — [разработка](development.md).

Простая D-роль по умолчанию содержит TSX/module.scss/index.ts. Небольшие типы и
до шести локальных визуальных пресетов находятся в TSX на уровне модуля:
прямые поля каждого пресета, без common/sizes/AXES/SCALES/skin boilerplate.
Составной пресет содержит смысловые слоты `button`/`icon`/`text`; часть получает
defaults слота, затем overrides, и может выбрать именованный пресет родителя.
Существенные части имеют свои стили. JSX остаётся в return; механизмы состояния,
клавиатуры и DOM lifecycle принадлежат библиотеке.

Именованные роли typography определяет конфиг приложения. Text выбирает роль
через `variant`, native controls — через `font`; свойства размера, веса и
межстрочного интервала не копируются в проектные пресеты. OS выводит авторский
текст через DText со скалярным variant h1/h2/h3/p1/p2/p3; этот словарь и семейство
DButton описаны в архитектуре приложения и не добавляют продуктовых ролей в
общий runtime Frontend.

## Публичные механизмы

У общей механики один владелец и основной публичный вход. Существующие
публичные вызовы используют тот же механизм. Провайдер, контроллер или hook
хранит состояние экземпляра в своей области. Общий runtime registry для
подключения механизмов не требуется. Дочерние узлы получают узкий контракт
через props или ограниченный контекст. Ключи, команды и данные передаёт приложение.

| Механизм | Публичное применение |
| --- | --- |
| Popup | `ui.popup.use` собирает tooltip/menu/context для поддерживающих их компонентов. Dropdown владеет позиционированием и площадкой. ContextPopup принимает точку и opener. Клавиатура, dismiss и возврат фокуса действуют и через порталы. Ссылки и submit сохраняют штатное действие. |
| Form | `ui.form.use` создаёт controller, `ui.form.field.use` читает состояние поля в этой форме. Refresh сохраняет dirty, submit фиксирует отправленный snapshot. Ошибка сохраняет правки для повтора. Нативная форма сохраняет `name`, FormData, reset и единый submit. |
| Edit | `ui.edit.use` ведёт черновик, фокус, клавиатуру и асинхронный commit. Ошибка оставляет ввод для повтора. `ui.edit.activity.use(scope)` собирает активность редакторов для guard владельца. |
| Action | `ui.action.use` управляет вызовом и pending. ActionInvocationProvider задаёт обработку ошибок и отмены. Нативный submit и прикладное действие исполняют команду один раз на намерение. |
| Async | `ui.async.use` адаптирует источник данных. Модель различает loading, empty и error. Проверяется наличие ошибки, включая falsy payload. Запрос и его отмена принадлежат потребителю. |
| Collection | `ui.collection.define` задаёт имя и стабильные ключи. `ui.collection.use` принимает управляемый `value` или начальный `defaultValue` и сообщает изменения через `onValueChange`. `ui.collection.item.use` читает состояние в области коллекции. |
| Range check | `ui.collection.check.use` управляет Shift-диапазоном для нативных checkbox, передаёт подходящие изменяемые строки в `onChange` и отслеживает `busy`. Вызов задаёт правила изменения и запись. |
| Calendar | `ui.calendar.use` возвращает дни, недели, данные по датам, видимый месяц, выбор и навигацию фокуса. Разметка принадлежит вызывающему компоненту. |
| Duration | `ui.duration.use({ value, onChange, maxMinutes, disabled, scope })` ведёт числовые черновики часов/минут, границы, клавиатуру и wheel. Возвращает hoursProps/minutesProps и rootRef; разметка и подписи принадлежат потребителю. |
| Disclosure | `ui.disclosure.define` задаёт defaults и навигацию, `ui.disclosure.use` создаёт controller. Flex передаёт его детям пропом `ui.disclosure`; `ui.disclosure.item.use` собирает trigger, heading и panel. Accordion и Accordion.Item используют этот механизм. |
| Navigation | `ui.navigation.use` даёт scoped навигацию по доступным элементам. Accordion и Dropdown разделяют правила клавиатурного обхода и сохраняют свои действия при выборе и закрытии. |
| Element | `ui.element.use` собирает refs, слои событий, стили и motion для `HTMLElement` или `SVGElement`. `useInteractiveElement` добавляет выбор HTML-хоста, ссылки, prefetch, popup и ARIA. |
| Scroll | Flex `ui.scroll` оформляет область прокрутки. Пресет `smooth` подключает плавную прокрутку окна (`target: 'window'`) или вертикального контейнера (`target: 'self'`). `ui.scroll.smooth.use` даёт команды внутри этой области. `ui.scroll.feed.use` обслуживает историю и удерживает позицию при подгрузке. |
| Collapse | `ui.collapse.use` возвращает trigger, настройки панели и controls. Компоненты используют общий DOM-механизм раскрытия, включая focus, скрытых детей и смену направления при прерывании. |

TSX показывает композицию. Модель, когда она нужна, собирает props, состояние
и предметную семантику контрола. ElementFrame управляет collapse и соседним
popup. ElementScope передаёт form, collection, disclosure и smooth controller
детям без нового DOM-узла. Selected относится к Collection, pending — к Action. Disabled
остаётся состоянием нативного контрола и учитывает ограничения Action.

Popup `menu` использует click или hover. Keyboard-open переводит фокус в панель,
Escape возвращает его opener. Touch long-press контекстного меню отменяется
при движении пальца сверх порога, раннем `pointerup` или `pointercancel`.
Публичный `beginPointerGesture` управляет pointer capture и очисткой listeners
в сценариях drag.

## Движение и первый показ

Общий формат `MotionChannels` задаёт каналы `appearance`, `hover`, `idle`
и `change`. Тип `animate` конкретного компонента задаёт поддержанные
каналы, эффекты и сочетания. Общие эффекты принадлежат `core/Motion`.

| Канал | Назначение |
| --- | --- |
| `appearance` | Первый показ через `when: 'load'` или `'inView'`. Modal и Dropdown также принимают `when: 'open'`. |
| `hover` | Реакция на указатель и клавиатурный фокус. Transform и rise доступны в типах подходящих поверхностей. |
| `idle` | Эффект в покое, например glow или контурный trace GradientBorder. |
| `change` | Смена контента, источника, раскладки или страницы. Триггер задаёт сам компонент. |

Эффекты используют существующий HTML- или SVG-узел либо предназначенный для
эффекта frame. Для Img, Video и нативного SVG учитывай в типах свойства
реального узла, границы клипа и доступное оформление.
Когда два эффекта управляют одним CSS-свойством или слотом содержимого,
допустимое сочетание задаёт тип компонента. См. [примеры и исключения](components.md#анимация-компонентов).

CSS и JS используют timing/easing одного конфига. SSR сохраняет
полезный первый HTML, смена состояния сохраняет фокус, отмена учитывает последний
запрос. Используй общие root/observers для reveal, parallax и perspective.
Учитывай reduced motion и освобождай listeners, таймеры и кадры после завершения.

Host может подключить `pageReadyScript` из `@delba/frontend/startup` в head перед
body с нужным CSP nonce. Скрипт ждёт layout шрифтов и освобождает страницу по
таймауту (по умолчанию 3000 мс). Без JS контент виден. Для этого bootstrap
используй `suppressHydrationWarning` на document element.

## Границы импорта

Внутри Frontend используй `#core` и `#core/<Feature>` для ядра, `#ui` для
общих механизмов и `#icons/*` для ресурсов. `#components` собирает базовые
примитивы для составного UI. Flex и Button берут свои зависимости из адресных
модулей, чтобы базовый barrel оставался однонаправленным. Приложения используют
публичные входы `@delba/frontend`.

| Вход | Назначение |
| --- | --- |
| `@delba/frontend` | React-компоненты, `ui`, hooks и публичные utilities; включает стили |
| `@delba/frontend/carousel`, `@delba/frontend/phone-field` | Выделенные React-входы со стилями пакета |
| `@delba/frontend/calendar` | Расчёты дат, сетки, диапазонов и группировки без React и CSS |
| `@delba/frontend/config`, `@delba/frontend/theme` | Авторская схема и типизированные селекторы темы |
| `@delba/frontend/skin`, `@delba/frontend/skin/runtime`, `@delba/frontend/skin/effects` | Проекции кожи, React runtime пресетов и Sass-эффекты |
| `@delba/frontend/rich-text`, `@delba/frontend/validation`, `@delba/frontend/url` | Роли, санитайзер, валидация и URL helpers для сценариев без React UI |
| `@delba/frontend/motion`, `@delba/frontend/startup` | Motion config/easing и bootstrap первого показа |
| `@delba/frontend/icons/controls/*` | Общие SVG-файлы контролов |
| `@delba/frontend/styles.scss`, `@delba/frontend/theme.css` | Публичные стили для native hosts |
| `@delba/frontend/next`, `@delba/frontend/next-env`, `@delba/frontend/module` | Native Next adapter, проекция ENV и module actions |
| `@delba/frontend/verify`, `@delba/frontend/prettier` | Явные Node helpers и форматирование |

Sass-входы `@delba/frontend/skin-states` и `@delba/frontend/mixins` разрешаются
через `sassOptions.loadPaths` в `withFrontend`. Состав package exports указан
в [package.json](../package.json). React API — в [каталоге](components.md).
