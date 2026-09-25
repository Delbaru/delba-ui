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

## Прокрутка окна

`SmoothScroll` (`src/components/SmoothScroll`) — плавная прокрутка без зависимостей, замена `LenisScroll`
(тот остаётся ради проектов на нём). Пишет в НАСТОЯЩИЙ скролл окна, поэтому sticky, поиск, фокус и
клавиатура живы. Один конфиг — пропы провайдера (`lerp`, `wheelMultiplier`, `duration`, `easing`,
`offset`, `mobile`, `anchors`, `updateHash`); API — `useSmoothScroll()` (`scrollTo`, `stop`, `scrollY`,
`subscribe`). Колесо над прокручиваемым контейнером, открытой `aria-modal` или узлом с
`data-smooth-scroll-ignore` (и `data-lenis-prevent`) — браузеру. Чистая математика хода, отступа и
разбора якорей — `smooth-scroll.ts` с тестами; `MEDIA_QUERY.touch` — «главный ввод — палец».

## Сворачивание

`Flex collapse` (обёртка `CollapseWrap` в `src/components/Flex/Flex.tsx`) — единственный движок
раскрытия по высоте или ширине: `collapseGap`, `collapseFade`, `collapseAxis`, `collapseAppear`,
`collapseOverflowVisible`, `onCollapseEnd`. По умолчанию закрытый блок **уходит из DOM**.

`collapseKeepMounted` — опт-ин «держать в DOM»: после сворачивания обёртка получает
`hidden="until-found"`, текст видят поисковики и Ctrl+F; браузер, найдя в нём совпадение, шлёт
`beforematch` → `onCollapseFound`, владелец ставит `collapse={true}`, блок встаёт открытым без хода.
Где `until-found` нет (и в серверном HTML) — `hidden` + `inert`, текст в разметке всё равно есть.
На нём построен `Accordion`. Грабли — `lessons/authoring.md`, «`hidden="until-found"`».

## Смена картинки

`Img animate` (`src/components/Img/swap`) — анимация смены картинки при смене `src`, пропом, без
обёрток: `fade`, `zoom`, `reveal`, `parallax`, `veil`; опции — `[ключ, { duration, direction, veil }]`.
Прежняя картинка держится слоем под новой; ход начинается, когда новая загрузилась. Смена посреди хода его не
обрывает: ждёт конца и едет сразу к последнему `src`, сторона берётся на старте хода. Сторону
(`direction`) знает вызывающий — порядок списка у него. Первый показ без хода, «меньше движения» — мгновенно.

## Появление по скроллу

`reveal` у `Flex`, `Grid`, `Box` и `Img` (`src/core/reveal`, хук `useReveal` внутри `useSharedMotion`):

```tsx
<Flex reveal="up">…</Flex>                                   // сам блок целиком
<Grid reveal={['up', { stagger: 0.08 }]}>{cards}</Grid>      // каскад по прямым детям
<Img reveal={['blur', { delay: 0.1 }]} … />                  // у Img без каскада
```

Ключи: `fade`, `up` (снизу), `left` / `right` (слева / справа), `scale` (из 0.96), `blur`; все — с fade.
Опции (`RevealOptions`, секунды): `stagger` (нет — ход у самого узла), `delay` (`0`), `duration`
(токен `--t-d-slow`, кривая `--t-t-f-cubic-bezier`), `distance` (rpx, `32`), `once` (`true`; `false` —
прячет снова, когда элемент уходит вниз), `threshold` (`0`), `rootMargin` (`'0px'`).

- **Каскад — пачками.** Дети наблюдаются по одному; вошедшие в экран одним отчётом получают
  `delay + порядок × stagger`. Высокая сетка раскрывается ряд за рядом, а не ждёт невидимый низ.
  Состав детей сторожит `MutationObserver` (Suspense, дозагрузка). Ребёнок со своим `reveal` — сам по себе.
- **Наблюдатель общий**: один `IntersectionObserver` на пару `threshold`/`rootMargin`, а не на узел.
- **Без JS видно.** Серверный HTML несёт `data-reveal`, прячет только CSS под
  `@media screen and (scripting: enabled)`. Класс на `<html>` не годится: его ставит скрипт в `<head>`,
  которого у кита нет, а поставленный гидрацией — это «видно → пропало → видно». Упал или опоздал
  бандл — страховочная анимация `ui-reveal-hold` держит элемент скрытым 3 с и отпускает; пришедший
  позже JS не прячет то, что уже на экране. Печать не прячет ничего.
- **Меньше движения** — ничего не прячется и не наблюдается (`m.reduced-motion`, `prefersReducedMotion()`).
- **Прячет анимация, а не стили.** Состояние — атрибут `data-reveal-state` (`wait` → `in` → `done`),
  ход — `@keyframes` без кадра `to`: конец берётся из стилей узла, стили проекта без слоя его не
  перебивают. На `done` анимация и `will-change` сняты.
- **С `parallax` и `perspective3d` на том же узле** складывается: ход — отдельные `translate`/`scale`/
  `opacity`/`filter`, у тех — `transform`. `blur` на узле с `perspective3d` на время хода сплющивает 3D.
- Не сочетать с `animation` у Flex на том же узле — обе пишут `animation`.
- Элемент выше экрана (перезагрузка посреди страницы, якорь) встаёт на место без хода.

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
| `useSharedMotion`, `useParallaxMotion`, `usePerspective3dMotion`, `useReveal` | параллакс, наклон и появление по скроллу (`reveal`) |
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
