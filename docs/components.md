# Публичные компоненты

Импортируй из `@delba/frontend`, если в строке не указан выделенный вход. Полные
типы и JSDoc принадлежат публичным экспортам [src/index.ts](../src/index.ts) и
[выделенным entrypoints](architecture.md#границы-импорта). Проектные экраны
сначала используют свои D-роли и пресеты. Указанные примеры описывают публичный API.

## Авторские пресеты

`ButtonPresets`, `FlexPresets`, `InputPresets`, `TextPresets` и типы других
владельцев описывают таблицы визуальных props со `states`. Примитив получает
объект через `preset`, явные props переопределяют его defaults. События, refs и
данные передаются экземпляру. Пресеты разрешает общий runtime Frontend.

```tsx
import { Button, Text, type ButtonPresets } from '@delba/frontend';

const presets = {
  secondary: {
    h: [32, 32, 32],
    p: [[4, 12], [4, 12], [4, 12]],
    r: [4, 4, 4],
    font: 'body',
    bg: ['var(--surface)', 'var(--surface)', 'var(--surface)'],
    states: { disabled: { opacity: 0.4 } },
  },
} satisfies ButtonPresets;

export function SaveButton() {
  return (
    <Button preset={presets.secondary} type="submit">
      <Text as="span" variant={['body', 'body', 'body']}>Сохранить</Text>
    </Button>
  );
}
```

Для простой D-роли основной состав — TSX/module.scss/index.ts. Небольшие типы
и до шести локальных пресетов находятся в TSX; поля записываются прямо, без
common/sizes/AXES/SCALES/skin boilerplate. Составные роли используют смысловые
слоты `button`/`icon`/`text` с именованными пресетами частей, затем явные overrides.
Проект OS выводит авторский текст через DText со скалярным `variant` из шести
ролей h1/h2/h3/p1/p2/p3, без публичного `preset`. Для native Button/Input/Textarea
используется именованный `font`, без дублирования raw typography. Внутри самого
Frontend подписи выводит Text; библиотека не импортирует D-роли приложения.

Семейство кнопок OS: DButton принимает `text`, DButton.Icon — только `icon` и
обязательный `aria-label`, DButton.IconText — `text` и объект `icon` с
`position: 'left' | 'right'`. DButton.Download — самостоятельная файловая
композиция со слотами button/icon и Body для имени/размера. Глиф IconText
выводится один раз, сторону меняет нативный `dir` Button row/row-reverse.

## Раскладка

| Компонент | Применение и основной API |
| --- | --- |
| Flex | Flex-раскладка с направлением через `dir`, нейтральный поток через `display`. Layout, DOM ref, семантический тег, popup, collapse, scroll и области UI. |
| Grid | Двумерная сетка с адаптивной раскладкой, layout animation и keyed детьми. |
| GridItem | Размещает ячейку Grid, задаёт её область и span. |
| Section | Композиция `Flex as="section"`; по умолчанию block flow, общие layout и UI props. |
| ScrollArea | Ограниченный по размеру viewport с `axis`, `fade` и `scrollbar`. Ref указывает на сам viewport. Неподвижные части располагаются снаружи. |
| ScrollbarActivity | Добавляет наблюдение активности на имеющейся scroll-поверхности без DOM-обёртки. |

Нейтральный контейнер после удаления Box — `Flex` с
`display={['block', 'block', 'block']}`. Прокрутка по оси `x` или `y`
задаётся через `ui.scroll` на том же DOM-узле. Ограничь viewport через layout props или размеры
`ui.scroll`. Явные layout props имеют приоритет. `shrink` задаёт flex-shrink
по полосам для элемента внутри flex-раскладки.

У layout-корней `grow` и `shrink` — адаптивные коэффициенты flex-элемента,
например `shrink={[0, 0, 0]}` для индикатора. Button также принимает адаптивный
`textAlign`; текст и размещение кнопки настраиваются props.

```tsx
import type { ReactNode } from 'react';
import { Flex } from '@delba/frontend';

export function MessageHistory({ children }: { children: ReactNode }) {
  return (
    <Flex
      display={['block', 'block', 'block']}
      h={[320, 240, 280]}
      ui={{ scroll: { preset: 'default', axis: 'y' } }}
      aria-label="История сообщений"
    >
      {children}
    </Flex>
  );
}
```

### Плавная прокрутка

Для вертикального контейнера подключи `target: 'self'` и ограничь его высоту.
Поддерево Flex получает команды через `ui.scroll.smooth.use()`.

```tsx
'use client';

import type { ReactNode } from 'react';
import { Button, Flex, ui } from '@delba/frontend';

function ScrollToStart() {
  const scroll = ui.scroll.smooth.use();
  return <Button onClick={() => scroll.scrollTo(0)}>В начало</Button>;
}

export function ScrollPanel({ children }: { children: ReactNode }) {
  return (
    <Flex h={[320, 240, 280]} ui={{ scroll: { preset: 'smooth', target: 'self' } }}>
      <ScrollToStart />
      {children}
    </Flex>
  );
}
```

`target: 'window'` подключает прокрутку документа. Опциональный `pathname`
связывает её с маршрутом. Изменение query при том же pathname сохраняет
позицию, а Back/Forward сохраняет восстановление браузера. Контроллер
предоставляет `scrollTo`, `stop`, текущий `scrollY` и `subscribe`.

## Текст и графика

| Компонент | Применение и основной API |
| --- | --- |
| Text | Семантика через `as`, именованная типографика через адаптивный `variant` и текстовые эффекты, включая timeline. |
| LexicalText | Вывод HTML или Lexical document. Общие стили форматированного текста доступны через `richTextClasses`. |
| Icon | Inline SVG из `src`, `component` или проектного `name`. Размеры SVG и корня задаются отдельно, paint управляется props SVG. |
| Img | Next Image с адаптивным `src`, сменой изображения, loading и доступным `alt`. |
| Skeleton | Сохраняет геометрию ожидаемого контента. |
| GradientBorder | Декоративная рамка сохраняет клики и overflow содержимого. |

Общие глифы контролов находятся в `assets/icons/controls/<semantic>.svg` и
доступны как `@delba/frontend/icons/controls/<semantic>.svg`. Отдельные формы
сохраняют отдельные SVG. Цветовые варианты используют props `color`, `fill`
или `stroke`. `currentColor` наследует цвет, а исходный fill/stroke SVG
служит запасным значением. Проектные design assets и словарь `name` остаются
у приложения, поиск по `name` использует его `public/icons`.

## Поля и действия

| Компонент | Применение и основной API |
| --- | --- |
| Button | Действие или переход. Сохраняет нативный тип кнопки/ссылки, ref, disabled/pending, подсказку и popup. `font` выбирает именованную типографику, `textAlign` — выравнивание текста по полосам, `dir` — направление и порядок частей. |
| Calendar | Оформленный выбор локальной даты `YYYY-MM-DD`. `minValue` и `maxValue` включены в диапазон. Calendar и поле даты Input используют общее ядро. |
| Input | Нативное однострочное поле, date и маски, validation, error/feedback и действия. Обновление значения и встроенные действия используют его полевой controller. |
| DurationPicker | Выбор длительности в часах и минутах. |
| Textarea | Нативное многострочное поле с layout и состояниями ввода. |
| LexicalTextarea | Редактор документа со списками, ссылками и переменными. `onChange` получает snapshot документа, а ref — документный handle. |
| Select | `options` и группы, одиночное `value` или массив при `multiple`. `search` передаёт запрос потребителю, выбранная подпись сохраняется при временном отсутствии options. |
| Checkbox | Нативный boolean или независимый выбор варианта. |
| Radio | Один вариант в нативной радиогруппе. |
| ChoiceButtons | Короткий видимый набор вариантов. |
| SwitchButton | Переключатель boolean с нативным состоянием поля. |
| PhoneField | Номер и страна. Callback получает структурированные сведения о номере. Также из `@delba/frontend/phone-field`. |

### Длительность с собственной разметкой

`ui.duration.use({ value, onChange, maxMinutes?, disabled?, scope? })` принимает
управляемое число минут. Передай `hoursProps`/`minutesProps` двум Input, а
`rootRef` — общему контейнеру. `commit`, `cancel` и `clamp` доступны отдельно.
Механизм допускает временно пустой числовой черновик, нормализует перенос минут
на blur/Enter и ограничивает итог целыми неотрицательными минутами до maxMinutes
(по умолчанию 1440). Enter и последующий blur не дублируют изменение.
Escape отменяет черновик, смена scope сбрасывает ввод предыдущего объекта.
Стрелки и колесо используют шаг 60 для часов и 1 для минут; Ctrl/Meta выбирает
10, Shift — 30. Nonpassive wheel listener и его cleanup принадлежат Frontend.
Disabled блокирует изменение; подписи и расположение полей задаёт потребитель.
DurationPicker сохраняет отдельное представление колёс и общую арифметику границ.

`onChange.preventDefault()` отменяет дальнейшее изменение модели Input/Textarea,
включая привязку Form. У неконтролируемого текстового поля восстанавливается прежний текст. Выбранный
браузером FileList программно не восстанавливается.

Поля с `name` участвуют в нативном FormData, сохраняют reset и события.
Controlled режим получает значение от владельца, default prop задаёт начальное
значение uncontrolled режима. LexicalTextarea синхронизирует внешний `content`
без пользовательского `onChange`. Его handle поддерживает focus/reset/setContent/
insertVariable/getValue; пользовательский callback получает `json`, `plainText`,
`characters`, `isEmpty`.

### Календарь с собственной разметкой

```tsx
'use client';

import { Button, Flex, ui } from '@delba/frontend';

export function DateChoices() {
  const { days, month, selection } = ui.calendar.use({ defaultMonth: '2026-11' });
  return (
    <Flex as="section" aria-label="Выбор даты">
      <Button onClick={month.previous}>Предыдущий месяц</Button>
      <Button onClick={month.next}>Следующий месяц</Button>
      {days.map(day => (
        <Button
          key={day.date}
          disabled={day.disabled}
          aria-pressed={day.selected}
          onClick={() => { selection.pick(day.date); }}
        >
          {day.date}
        </Button>
      ))}
    </Flex>
  );
}
```

Месяц задаётся `month` / `defaultMonth` в формате `YYYY-MM`, выбранная дата —
`value` / `defaultValue` в формате `YYYY-MM-DD`. `value: null` означает
управляемый пустой выбор. `onPick` вызывается при каждом разрешённом выборе,
включая повторное нажатие. Передай `items` и `getDate` для группировки данных.
Для расчётов отдельно от UI импортируй `calendar` из
`@delba/frontend/calendar`, например `calendar.monthGrid('2026-11')`.

### Выбор элементов и диапазон checkbox

`ui.collection.use(definition, items, { value, onValueChange })` принимает
список ID от владельца. Для локального выбора используй `defaultValue`.
`mode: 'single'` ограничивает выбор одним ID, `retainMissing` сохраняет
выбранные ID при временном отсутствии строк, а новый `scope` сбрасывает
локальный выбор и якорь.

Для диапазона отметок `ui.collection.check.use({ scope, items, canChange,
isChecked, onChange })` возвращает `captureProps` для контейнера,
`change(row, event)` для нативного checkbox и `checkAll()` для отметки
доступных строк. `onChange(rows, checked)` получает только изменяемые строки
с новым состоянием. Для последовательной записи используй
`applyCheckRange(rows, row => save(row, checked))` из `@delba/frontend`. Первый отказ
останавливает диапазон, подтверждённые записи сохраняются.

## Анимация компонентов

Каналы `animate` описаны в [архитектуре](architecture.md#движение-и-первый-показ).
Доступные эффекты задаёт тип компонента.

| Компонент | Особенности каналов |
| --- | --- |
| Text | Timeline и counter используют `appearance`. Изменение текста и счётчика использует `change`, а текстовый slide может реагировать на `hover`. Тип выбирает один эффект, управляющий содержимым. |
| Flex | `change` использует ключ содержимого. На одном корневом узле применяй `appearance` или `change`. К каждому можно добавить hover и idle. |
| Grid | `change.effect: 'layout'` перестраивает элементы по стабильным ключам. |
| Icon и Img | `change` задаёт смену значка или изображения. Например, `swap` у Icon и `fade` у Img. |
| Img и Video | Поддержанный hover на рамке медиа — `transform`. |
| GradientBorder | `idle: { effect: 'trace', duration }` управляет бликом контура. |
| Modal и Dropdown | `appearance: { when: 'open', effect: 'fade' }` привязывает эффект к открытию. Modal принимает его в `animate`, Dropdown — в `panel.animate`. |
| PageTransition | `change` применяется при изменении `location`. Например, `{ change: { effect: 'up', duration: 'fast' } }`. |

Button принимает `appearance`, `hover` и `idle`. Подсказка задаётся объектом
`ui.popup` с `preset: 'tooltip'`, `text` и необязательными
`position`, `gap`, `surface`. При миграции Button перенеси `tooltip`,
`tooltipDirection` и `tooltipGap` в `text`, `position` и `gap` этого объекта.
Проектные D-роли передают настройки подсказки тем же объектом `ui.popup`.

```tsx
import { Button } from '@delba/frontend';

export function OrdersLink() {
  return (
    <Button
      href="/orders"
      animate={{
        appearance: { when: 'load', effect: 'fade', duration: 'fast' },
        hover: { effect: 'rise', fill: 'var(--primary-hover)' },
        idle: { effect: 'glow' },
      }}
      ui={{
        popup: {
          preset: 'tooltip',
          text: 'История и статусы заказов',
          position: 'bottom',
          gap: 8,
          surface: true,
        },
      }}
    >
      Заказы
    </Button>
  );
}
```

Flex может выбрать `change` вместо `appearance`. Публичный
`FlexContentAnimate` включает поля `effect`, `key` и необязательную `duration`.
Ключ меняется вместе с содержимым, внешний React key
остаётся стабильным.

```tsx
import { Flex } from '@delba/frontend';

export function OrderStatus({ status }: { status: string }) {
  return (
    <Flex
      animate={{
        change: { effect: 'fade', key: status, duration: 'fast' },
        hover: { effect: 'transform', y: -4 },
      }}
    >
      {status}
    </Flex>
  );
}
```

## Раскрытие, слои и обратная связь

| Компонент | Применение и основной API |
| --- | --- |
| Accordion | Группа разделов `Accordion.Item` с `value` либо `defaultValue`, `onValueChange`, `multiple`, `collapsible`, общими `headingAs` и `indicator`. |
| Dropdown | Панель возле триггера. Позиционирование, dismiss, overlay и nested portal принадлежат поверхности. |
| ContextPopup | Контекстная панель в переданной `point` с opener и возвратом фокуса. |
| MediaDropDown | Выбор медиа через URL или загрузку файла. |
| Modal | Диалог с `trigger` или `open` и `onOpenChange`, overlay, focus boundary и доступным именем. `drag: { handle, margin }` задаёт селектор ручки и отступ от viewport в CSS px. `closeOn.ignoreWithin` оставляет клавиатурные события области, выбранной селектором. `scroll.overflow` выбирает `auto` или `hidden`. |
| ModalProvider | Стек модальных окон и программное открытие через `useModal`. |
| Tooltip | Краткое пояснение. Действие сохраняет собственное доступное имя. |
| ActionInvocationProvider | Область обработки pending, ошибок и отмены прикладного действия. |
| ToastProvider | Очередь уведомлений через `useToast` или `toast`. |
| TabTrack | `value` и `thumb` для индикатора у активного дочернего элемента. |
| InteractionScope | Контекст активности без дополнительной DOM-обёртки. |

В Accordion single использует ключ или `null`, multiple — список ключей.
По умолчанию все разделы закрыты, один открытый раздел можно закрыть повторно.
Заголовок группы по умолчанию `h3`, элемент может его переопределить.
`Accordion.Item` принимает уникальный `value` и обязательный объект
`trigger={{ content, ...settings }}` с настройками Button. `panelProps` задаёт
раскладку, атрибуты и ref панели. Disclosure связывает триггер и панель через
ARIA, управляет клавиатурой и пропускает disabled пункты. `indicator={null}`
скрывает общий индикатор.

```tsx
import { Accordion } from '@delba/frontend';

export function Help() {
  return (
    <Accordion defaultValue="delivery">
      <Accordion.Item value="delivery" trigger={{ content: 'Доставка' }}>
        Заказ можно получить в студии.
      </Accordion.Item>
      <Accordion.Item value="payment" trigger={{ content: 'Оплата' }}>
        Способ оплаты указывается в заказе.
      </Accordion.Item>
    </Accordion>
  );
}
```

В Next интерактивное состояние примеров размещается под client boundary.

## Медиа и движение

| Компонент | Применение и основной API |
| --- | --- |
| Carousel | Swiper-карусель. `children`, `slidesPerView`, `gap`, `orientation`, `effect`, `drag`, `autoplay` и внешние контролы. |
| CarouselDots | Индикаторы выбранного слайда. Также из `@delba/frontend/carousel`. |
| CarouselNav | Навигация карусели. Также из `@delba/frontend/carousel`. |
| Marquee | Непрерывная декоративная лента. |
| Video | HTML-видео, адаптивные источники и native controls. |
| VideoPlayer | Плеер с собственными контролами и внешним контроллером `useVideoPlayer`. |
| NativeCarousel | Scroll-snap карусель с `useCarouselController`, keyboard/drag и autoplay из `@delba/frontend/carousel`. |
| CarouselProgress | Прогресс воспроизведения из `@delba/frontend/carousel`. |
| CarouselTimer | Таймер воспроизведения из `@delba/frontend/carousel`. |
| PageTransition | React ViewTransition с `location` по pathname и `animate.change`. Сохраняет дерево роутера. |

NativeCarousel использует один controller для навигации, drag, autoplay и
синхронизации и сохраняет один экземпляр интерактивных детей. Время, pause
reasons и прогресс относятся к одному воспроизведению. Swiper остаётся основой
публичного Carousel.

В каталоге перечисляются экспортируемые React-компоненты, включая providers и
публичные составные части. Добавляй публичный компонент и его строку вместе.
Внутренние FieldFrame и CollapseWrap принадлежат своим механизмам.
