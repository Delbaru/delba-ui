# Ядро: что уже написано

Прежде чем заводить помощник — проверь здесь. Копия любой из этих вещей внутри компонента
считается ошибкой ревью: расхождение копий и есть источник «на планшете поехало».

---

## Раскладка

| Что | Где | Зачем |
|---|---|---|
| `splitBoxLayout`, `boxLayout` | `src/core/layout/box.ts` | пропы коробки (отступы, размеры, радиусы, рамка, фон, `grow`) одинаково у любого корня |
| `resolveResponsive`, `getBreakpointIndex`, `resolveResponsiveAtBreakpoint` | `src/core/base/responsive.ts` | кортеж `[desktop, mobile, tablet]` → значения; `null` — пропуск |
| `ResponsiveInput<T>`, `ResponsiveValue<T>` | там же | вход помощников против типа пропа; строгий режим включает проект через `UiRules` |
| `createLayoutClasses`, `utilityClasses`, `MEDIA`, `UTILITIES` | `src/core/layout`, `src/core/utilities` | имя класса утилиты = имя пропа; реестр — единственный источник правды |

## Полосы и медиазапросы

`src/core/base/breakpoints.ts` — `BREAKPOINT` (числа) и `MEDIA_QUERY` (строки запросов: `desktop`,
`below`, `mobile`, `tablet`, `reducedMotion`). **Единственный источник.** Раньше те же 767/1023/1024
жили пятью копиями и расходились. В SCSS то же самое даёт `src/core/_mixins.scss`.

`src/core/base/scale.ts` — масштаб: `UiScale` (базы `mobile`/`tablet`/`desktop` и потолок `max`), `DEFAULT_SCALE`,
`scaleCss` (блок `--base-width`/`--rpx` по полосам) и `imageSizes` (атрибут `sizes` из ширин в rpx). Значения
проекта — генерат `src/core/scale.ts` (`SCALE`); пока его нет, `import … from './scale'` берёт папку
`src/core/scale/` с умолчаниями — файл резолвится раньше папки.

## Движение

`src/core/base/motion.ts`:

- `prefersReducedMotion()` — одна проверка на всю библиотеку;
- `readMotionMs(node, kind)` — длительность transition или animation из вычисленных стилей;
- `MOTION_END_BUFFER_MS` — единый запас страховочного таймера (раньше рядом стояли +40, +50, +60, +80).

## Сворачивание

`Flex collapse` (обёртка `CollapseWrap` в `src/components/Flex/Flex.tsx`) — единственный движок
раскрытия по высоте или ширине: `collapseGap`, `collapseFade`, `collapseAxis`, `collapseAppear`,
`collapseOverflowVisible`, `onCollapseEnd`. По умолчанию закрытый блок **уходит из DOM**.

`collapseKeepMounted` — опт-ин «держать в DOM»: после сворачивания обёртка получает
`hidden="until-found"`, текст видят поисковики и Ctrl+F; браузер, найдя в нём совпадение, шлёт
`beforematch` → `onCollapseFound`, владелец ставит `collapse={true}`, блок встаёт открытым без хода.
Где `until-found` нет (и в серверном HTML) — `hidden` + `inert`, текст в разметке всё равно есть.
На нём построен `Accordion`. Грабли — `lessons/authoring.md`, «`hidden="until-found"`».

## Смена содержимого на месте

`Crossfade` + `CrossfadeItem` (`src/components/Crossfade`) — стопка пунктов в одной ячейке грида,
видно один (`value`), смена — `effect`: `fade`, `zoom` (проявление с масштабом 1.06→1), `reveal`
(клип снизу вверх поверх прежнего). `duration` — токен `--t-d-fast|normal|slow`. Ячейку задаёт самый
крупный пункт; все пункты в DOM, неактивные — `aria-hidden` + `inert`; пункт несёт `state`
`active` / `leaving`. Уходящий прячется после входящего — фон под стопкой не проглядывает. Первый кадр
без анимации, «меньше движения» — мгновенно. `useSwapTransition` (exit → подмена → enter на одном
узле) — для текста и блоков разной высоты; `Crossfade` — когда старое и новое должны перекрыться.

## Текст и числа

`src/core/base/text-format.ts` — `pluralize(value, [one, few, many])` и `pad(value, length = 2)`.
`src/core/utils.ts` — `clamp` и `clamp01`. `src/core/base/cn.ts` — `cx` (склейка КЛАССОВ; состояния,
идентификаторы для `aria-*` и значения `transform` ею не склеивают).
`src/core/base/typography.ts` — варианты проекта (`UiTypography`, `TextVariantName`), служебные роли
`TEXT_ROLES` (`body`, `caption`, `micro`) и `textFont(name)`: шрифт роли — с фолбэком на прежний вариант.
В компонентах кита — только роли, варианты проекта кит не называет.

## HTML и иконки

`src/core/base/html-sanitize.ts` — `sanitizeRichTextHtml(html, options?)`: DOMPurify по белому списку,
безопасен в SSR. `{ rich: true }` (`SanitizeRichTextOptions`) добавляет разметку Markdown/GFM — `pre`,
таблицы (`table`…`td`), `blockquote`, `hr`, `del`, `s` и атрибут `align`; без опции набор прежний.
Скрипты, `on*` и `javascript:` режутся в обоих режимах.

`src/components/Icon/useFetchedSvg.ts` — `preloadIcon(url)`: прогрев кэша SVG (оба ключа — сырой и
перекрашиваемый) до показа иконки. На сервере и для инлайн-иконок ничего не делает.

## Хуки

| Хук | Что делает |
|---|---|
| `useMediaQuery(query)` | подписка на медиазапрос, безопасная на сервере |
| `useOutsideDismiss(refs, onDismiss, { enabled, escape })` | закрытие по клику вне и по Escape; возвращает `{ onMouseDownCapture }` для корня панели, из которой открываются вложенные слои в своих порталах, и не закрывает по Escape, который уже погасил внутренний слой |
| `usePresence(show, axis, appear)` | монтирование и размонтирование с анимацией |
| `useSwapTransition(key, children)` | подмена контента: exit старого, затем enter нового |
| `useAnchoredFloating` | позиционирование панели относительно якоря |
| `useSharedMotion`, `useParallaxMotion`, `usePerspective3dMotion` | параллакс и наклон |
| `useTextOverflow`, `useTooltip`, `useFancybox`, `useInView`, `useMergedRefs` | по названию |

## SCSS

`src/core/_mixins.scss` — `role-font($role, $legacy?)` (шрифт служебной роли), `reduced-motion`, `truncate`, `line-clamp($n)`, `fill`, `hidden-control`,
`thin-scrollbar-track`, `thin-scrollbar-hover`, `hide-scrollbar`.
`src/core/tokens.global.scss` — классы примитивов `ui-*` и подключение генерата по слоям.
`src/core/scss-utils.scss` — `withBreakpoints` (остальные миксины там вытеснены генератором утилит).

## Договор темы

`theme/tokens.default.scss` — стартовые значения всего, что библиотека берёт у проекта, с нулевой
специфичностью. Добавил в код `var(--новый-токен)` — добавь его и сюда, иначе у потребителя молча
пропадёт цвет или отступ. Проверка — `tools/check-tokens.mjs`.
