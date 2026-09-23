# @delba/ui — общая UI-библиотека

Примитивы дизайн-системы (`Flex`, `Grid`, `Text`, `Icon`, `Img`, `Button`, `Modal`, `Select`,
`Input`…) и хуки, на которых они держатся. Подключается в проект git-сабмодулем и **пакетом его
воркспейса** `@delba/ui`. Каждый проект закреплён на своём коммите и обновляется, только когда сам решит.

**История этого репозитория не переписывается** (никаких force-push): проекты ссылаются на
конкретные коммиты, и стёртый коммит ломает их свежий клон.

## Правишь библиотеку?

Этот README — для тех, кто библиотеку ПОДКЛЮЧАЕТ. Кто её ПРАВИТ, читает [`CLAUDE.md`](CLAUDE.md)
(маршрутизация и красные линии) и [`docs/Library.md`](docs/Library.md) (навигатор по справочнику:
авторинг, ядро, приёмка, журнал грабель).

## Граница

Ни один файл отсюда не импортирует ничего снаружи этой папки. Всё продуктовое — скины,
пресеты, `Shared*`-компоненты, словари, значения токенов — живёт в проекте. Сторож —
`pnpm --filter @delba/ui boundary`.

И в обратную сторону: проект берёт у кита **только объявленные входы**; внутренняя раскладка
(`src/components`, `src/core`…) может переехать в любой момент.

| Вход | Что | Пример |
|---|---|---|
| `@delba/ui` | компоненты, хуки, типы (`src/index.ts`) | `import { Flex, Text } from '@delba/ui'` |
| `@delba/ui/skin` | движок шкур для D-/Shared-компонентов | `import { defineSkin } from '@delba/ui/skin'` |
| `@delba/ui/icons/*` | иконки кита (`assets/icons/ui/*`) | `import eye from '@delba/ui/icons/eye/style-1/eye.svg'` → `assetUrl(eye)` |
| `@delba/ui/next` | плагин Next `withUi` и `UI_SASS` (типы — `tools/next.d.mts`) | `export default withUi(nextConfig)` |
| `@delba/ui/rich-text` | роли и санитайзер rich-text без React и SCSS — для node-скриптов и route handlers | `import { sanitizeRichTextHtml, RICH_ROLES } from '@delba/ui/rich-text'` |
| `@delba/ui/config` | тип `UiConfig` для `ui.config.ts` | `import type { UiConfig } from '@delba/ui/config'` |
| `delba-ui` | CLI (bin пакета) | `delba-ui build`, `watch`, `check` |

SCSS-входы — под теми же именами, но их даёт `loadPaths` плагина (`UI_SASS` = `tools/sass`), а не `exports`:

| SCSS | Куда |
|---|---|
| `@use '@delba/ui/styles'` | глобальные стили: утилиты раскладки и классы примитивов `ui-*` |
| `@use '@delba/ui/theme'` | глобальные стили нового проекта: стартовая тема |
| `@use '@delba/ui/skin-classes'` | глобальные стили: классы покоя шкур (генерат) |
| `@use '@delba/ui/mixins' as m` | CSS-модули проекта: миксины ядра (`m.reduced-motion`, `m.truncate`…) |
| `@use '@delba/ui/skin-states' as *` | генераты `_states.scss` шкур — пишет CLI |

Почему не через `exports`: файл, который отдал импортёр сборщика (sass-loader в Turbopack), теряет
относительные `@use` и `meta.load-css` внутри себя, а ядро кита на них стоит. Файлы из `loadPaths`
sass читает сам. Поэтому SCSS-имя не совпадает с JS-входом: `skin` занят кодом, отсюда `skin-states`.

## Подключение

```bash
git submodule add -b main https://github.com/Delbaru/delba-ui.git delba-ui
```

```yaml
# pnpm-workspace.yaml
packages:
  - site
  - delba-ui
```

```jsonc
// site/package.json
"dependencies": { "@delba/ui": "workspace:*" /* + peer-зависимости кита, см. его package.json */ },
"scripts": { "check": "delba-ui build && tsc --noEmit && eslint . && delba-ui check" }
```

```js
// next.config.mjs
import { withUi } from '@delba/ui/next';
export default withUi(nextConfig);
```

Алиасов `@delba/ui` в `tsconfig.json` не нужно: tsc, eslint-import-resolver и Turbopack находят пакет
по `exports`. Клонировать проект вместе с библиотекой — `git clone --recurse-submodules …`; уже
склонирован — `git submodule update --init`.

**Один React.** Кит объявляет `react`, `next`, `swiper`… в `peerDependencies`; pnpm ставит их ему
ссылками на те же копии, что у приложения (диапазоны совпадают), поэтому хойстинг (`shamefullyHoist`)
киту не нужен. Проверка: `require.resolve('react')` от файла кита и от файла приложения дают один
`realpath`. Разъедутся диапазоны — будет две копии и «Invalid hook call»: держите peer кита и
зависимости приложения в одних границах.

Плагин `withUi` добавляет кит в `transpilePackages`, ставит `sassOptions` (modern API и `loadPaths`
для SCSS-входов) и зовёт генерацию CLI: в `next build` — один раз до сборки, в `next dev` — сборка и
watcher, который умирает вместе с dev. Проект со своим конфигом Next берёт `UI_SASS` из
`@delba/ui/next` и кладёт его в `sassOptions.loadPaths` сам.

**CLI** (из папки приложения, конфиг — `ui.config.ts` рядом, пример — `site/ui.config.ts` в
serdcaBezGranic):

```bash
delba-ui build   # шкуры, утилиты, масштаб
delba-ui watch   # то же и следит; правка конфига или пресета — перезапуск
delba-ui check   # красные линии (--update опускает планку), договор темы, старые пути к киту
```

Конфиг ([`tools/config.ts`](tools/config.ts)) — всё необязательно: `scan` (`['src']`, кит
сканируется всегда), `seeds`, `theme` (`theme`), `rules` (`['src']`), `baseline`
(`.rules-baseline.json`), `skins`, `scale` (базы масштаба, см. ниже), `typography` (варианты
типографики, см. «Тему»). `tsx` для CLI кит несёт сам; `typescript` и `sass` — peer.

## Что должен дать проект

- **Кит может лежать git-зависимостью** (`"@delba/ui": "git+https://…#<коммит>"`) — тогда он
  настоящая папка `<проект>/node_modules/@delba/ui`, а не симлинк воркспейса. Генератор утилит
  сканирует его и там: `node_modules`, `.next`, `dist`… пропускаются по пути от корня скана, а не по
  абсолютному. Генераты пишутся внутрь этой папки и стираются переустановкой: `withUi` пишет их
  заново на каждом `next dev`/`next build`, без плагина — `delba-ui build` после установки.
- **Пакеты** — `peerDependencies` в [`package.json`](package.json). Там же `sideEffects`:
  благодаря ему сборка выкидывает со страницы то, что она не использует (Lexical, Swiper,
  видеоплеер), даже если импорт идёт через общий вход. Стенд, который ставит без devDependencies,
  должен найти peer-пакеты в `dependencies` приложения.
- **Генераты.** `src/core/_utilities.scss` (классы под значения, которые реально встречаются в коде) и
  `src/core/_field-sizes.scss` пишет генератор утилит [`tools/utilities`](tools/utilities). Без них
  сборка стилей не пройдёт, в репозиторий они не попадают: у каждого проекта свои. Их делает CLI
  выше; проект со своим скриптом зовёт генератор напрямую:

  ```bash
  node --import tsx <кит>/tools/utilities/cli.ts build --config <конфиг проекта>   # или watch
  ```

  Конфиг — `{ scan: ['apps', 'libs'], seeds?, typography? }`, пути от cwd, пример — `tools/ui/utilities.config.ts` в socrat.
- **Масштаб.** `1rpx = ширина окна / база полосы`, на десктопе шире потолка rpx не растёт. Базы —
  `scale` в `ui.config.ts` (умолчания `{ mobile: 320, tablet: 768, desktop: 1920, max: 2560 }`); генератор
  пишет из них `--base-width`/`--rpx` (`src/core/_scale.scss`, слой `ui.scale` — тема проекта со своим `--rpx`
  его перебивает) и `src/core/scale.ts` для JS. По тем же числам `Img` считает `sizes`: `w={624}` →
  `(min-width: 2560px) 832px, 32.5vw`. Тема проекта `--rpx` больше задавать не должна.
- **`@use '@delba/ui/styles'` в глобальных стилях**: там утилиты раскладки и классы примитивов `ui-*`
  (`ui-flex`, `ui-text`, `ui-icon`…). У примитивов нет CSS-модулей, без этого файла они голые.
- **Иконки кита копировать не нужно.** Компоненты берут их импортом из `assets/`, сборщик кладёт их
  в свою статику (`/_next/static/media/…`). В коде проекта иконки кита — тоже импортом:
  `import eye from '@delba/ui/icons/eye/style-1/eye.svg'` и `<Icon src={assetUrl(eye)} />`.
- **Шкуры — по желанию.** Движок `@delba/ui/skin` (`defineSkin`, `resolveSkin`, `skinPad`,
  `skinRadius`) для компонентов проекта с пресетами. Данные — у проекта: в `skins` конфига словари
  `fills`/`lines`/`texts` и `dir` с компонентами, где лежат `*.skin.ts`. Генератор пишет
  `src/skin/_tokens.scss`, `src/skin/_classes.scss` (классы покоя `sk_*` — `@use '@delba/ui/skin-classes'`
  в глобальные стили) и `_states.scss` рядом с каждым компонентом (`@use './states'` в его модуле).
- **Тему.** Договор — это CSS-переменные, семейства типографики и атрибутные правила
  (`[data-hide-mobile]`…), которые библиотека берёт у проекта. Проверка — `delba-ui check`, без CLI:

  ```bash
  node <кит>/tools/check-tokens.mjs <папки стилей проекта…>    # чего не хватает
  node <кит>/tools/check-tokens.mjs --list                     # весь договор
  ```

  Цвета договор называет ролями. Бренд — `--primary` (+ `-hover`, `-light`, `-dark`) и
  `--tertiary` (только `Button variant="tertiary"`); статусы — `--error`, `--error-light`,
  `--success`, `--warning`; нейтральные — `--background`, `--text`, `--black` (чернила полей),
  `--text-muted` (приглушённый текст, плейсхолдер, disabled), `--line` (линии и рамки), `--white-*`.
  Служебное роли бренда не занимает: `--secondary` проект может отдать под бренд целиком.

  **Типографика — у проекта, как цвета.** Набор вариантов объявляется одним списком в
  `ui.config.ts`, тип выводится из него (второго списка нет):

  ```ts
  // ui.config.ts
  typography: ['h1', 'h2', 'h3', 'p1', 'p2', 'p3', 'p4', 'p5'] as const,
  // index.d.ts (глобальная декларация, рядом с UiRules)
  interface UiTypography { variants: (typeof import('./ui.config'))['default']['typography'][number] }
  ```

  Тогда `Text variant` и `Input font` принимают только эти имена, генератор печатает классы
  `text_<имя>` на `--font-<имя>`, `--tt-<имя>`, `--ls-<имя>` (`numbersPlus` → `numbers-plus`), а
  `check` требует `--font-<имя>` в теме. Ничего не объявлено — прежний набор (`h1`–`h4`, `p1`–`p3`,
  `title`, `subtitle`, `p`, `small`, `dop`, `numbers`, `numbersPlus`), для проектов до этого решения.

  Свои компоненты кит набирает **служебными ролями**, а не вариантами проекта: `--font-body`
  (текст полей, тостов, подписей элементов), `--font-caption` (подписи и комментарии полей),
  `--font-micro` (тултип, тайм-код). Тема связывает роль со своим вариантом
  (`--font-caption: var(--font-p4)`); роль есть и в `Text variant` (`'caption'`). Роли в договоре,
  но кит читает их с фолбэком на прежний вариант (`var(--font-body, var(--font-p))`), поэтому тема
  без ролей выглядит как раньше, а `check` подсказывает, что добавить. `RichText` читает варианты
  контента с пустым фолбэком (`var(--font-h4,)`): нет токена — шрифт наследуется от `Text`.

  Для нового проекта есть стартовая тема [`theme/tokens.default.scss`](theme/tokens.default.scss):
  `@use '@delba/ui/theme'` в глобальных стилях, и библиотека заработает сразу. Специфичность у неё нулевая,
  так что своя тема проекта перебивает её при любом порядке подключения.

## Словари — у проекта

`LexicalTextarea` не знает, какие бывают переменные. Проект передаёт их в `variables`, и у
каждой переменной своя иконка (`icon`) — библиотека больше не подставляет её по ключу.

## Проверки качества

Из корня проекта:

```bash
pnpm --filter @delba/ui typecheck    # строгий TypeScript самой библиотеки
pnpm --filter @delba/ui test         # юнит-тесты ядра и tools
pnpm --filter @delba/ui boundary     # ни одного импорта наружу папки
```

Из папки приложения — `delba-ui check`: красные линии с храповиком (`check-rules.mjs`), договор темы
(`check-tokens.mjs`) и старые пути к киту (`check-migration.mjs`). Каждый скрипт запускается и сам:
`node <кит>/tools/check-rules.mjs --baseline <файл> <папки проекта…>`.

`tsconfig.json` библиотеки строже обычного: помимо `strict` включены `noUncheckedIndexedAccess`,
`noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals` и
`noUnusedParameters`. `any`, `@ts-ignore`, `eslint-disable` и утверждений `!` в коде нет;
`as unknown as` — одно, в точке стирания типа реестра анимаций `Text` (`defineAnimation`).

`check-rules.mjs` считает нарушения красных линий в коде ПРОЕКТА (сырые `<button>`/`<input>`/`<a>`,
инлайн-`<svg>`, условный рендер без анимации, числа мимо сетки 4, транзишны без токенов,
`@media`). Планка лежит в проекте; сборка падает, только если нарушений стало больше.

## Обновление в проекте

```bash
git -C delba-ui pull origin main
pnpm install && pnpm check            # новые peer или входы кита — install обязателен
git add delba-ui pnpm-lock.yaml && git commit -m "UI: обновить библиотеку"
```

После обновления, сменившего зависимости или раскладку, перезапустите `next dev`, а при странных
ошибках резолва — удалите `.next/cache` (Turbopack кеширует резолв SCSS, tsc — `.tsbuildinfo`).

Правка изнутри проекта: в папке сабмодуля `git switch main` → правка → коммит и пуш сюда →
в проекте закоммитить сдвиг ссылки.

## Совместимость

- **Добавлять, а не переименовывать.** Новый проп или вариант не ломает никого. Если ломаешь,
  помечай коммит `BREAKING:` и пиши в нём «как перейти».
- **`null` в кортеже `[desktop, mobile, tablet]`** значит «пропустить брейкпоинт», а не
  «унаследовать desktop».

## Переход на 2.0

**2026-09-23 — кит стал пакетом `@delba/ui` с картой `exports`.** Проект на 1.x лез внутрь папки
сабмодуля; теперь раскладка приватна (`src/components`, `src/core`, `assets`), а входы — в таблице
«Граница». `delba-ui check` (и `check-tokens.mjs`, который зовут socrat и D4Y) находит старые пути и
`<Container/>` и печатает замену построчно: `node <кит>/tools/check-migration.mjs <папки проекта…>`.

**1. Пакет воркспейса.** Папку сабмодуля (`UI`, `delba-ui` — как угодно) — в `packages` у
`pnpm-workspace.yaml`, приложению — `"@delba/ui": "workspace:*"`, затем `pnpm install`. Алиасы на
папку кита в `tsconfig` (`@socrat/shared/ui/ui`, `…/container`, `…/grid`, `@delba/ui/*`) — убрать или
перенаправить на пакет. `shamefullyHoist` ради кита больше не нужен (см. «Один React»).

**2. Пути.**

| Было (1.x) | Стало (2.0) |
|---|---|
| `import … from '<UI>'` / `'<UI>/Grid'` / `'<UI>/Modal'` / `'<UI>/Toast'` / `'<UI>/RichTextarea'` | `import … from '@delba/ui'` |
| `'<UI>/core'`: `cx`, `MEDIA_QUERY`, `clamp`, `prefersReducedMotion`, `MOTION_END_BUFFER_MS`, `ResponsiveValue`… | `'@delba/ui'` (там же теперь `mergeComponentStates`, `ComponentStateValue`, `assetUrl`) |
| `'<UI>/core/component-state'`, `'<UI>/core/utils'`, `'<UI>/hooks/…'`, `'<UI>/core/useInView'`, `'<UI>/LenisScroll'` | `'@delba/ui'` |
| `'<UI>/skin'` | `'@delba/ui/skin'` |
| `import { withUi } from '<UI>/next.mjs'` | `import { withUi } from '@delba/ui/next'` |
| `import type { UiConfig } from '<UI>/tools/config'` | `import type { UiConfig } from '@delba/ui/config'` |
| `node <UI>/tools/cli.mjs build` | `delba-ui build` (bin пакета) |
| `node --import tsx <UI>/tools/utilities/cli.ts …` | без изменений (путь `tools/` тот же) |

Нужного символа нет в `@delba/ui` — это повод добавить его во вход кита, а не лезть в `src/`.

**3. SCSS.**

| Было | Стало |
|---|---|
| `@use '<путь>/UI/core/tokens.global.scss'` | `@use '@delba/ui/styles'` |
| `@use '<путь>/UI/theme/tokens.default.scss'` | `@use '@delba/ui/theme'` |
| `@use '<путь>/UI/skin/classes'` | `@use '@delba/ui/skin-classes'` |
| `@use 'mixins'` / `@use 'UI/core/mixins'` / `@use '../../UI/core/mixins'` | `@use '@delba/ui/mixins' as m` |
| `sassOptions.loadPaths: [<путь>/UI/core]` или `[<родитель UI>]` | `withUi` ставит сам; без него — `loadPaths: [UI_SASS]` из `@delba/ui/next` |

`_states.scss` шкур перегенерирует CLI (`@use '@delba/ui/skin-states'`). Свои `loadPaths` проекта
(`src/styles` у socrat) остаются — `withUi` дописывает свой путь к ним.

**4. Иконки.** Кит больше не копирует `public/` в проект (`public` в `ui.config.ts` удалён, CLI
подскажет). Компоненты кита берут иконки импортом — копия не нужна. Если проект сам зовёт иконки
кита по адресу `/icons/ui/…` (у socrat их сотни), два пути:
- импорт: `import arrow from '@delba/ui/icons/arrows/style-3/arrow.svg'` и `<Icon src={assetUrl(arrow)} />`;
- или прежняя раскладка своим скриптом: источник теперь `<UI>/assets/icons/ui`, а не `<UI>/public/icons/ui`
  (у socrat — `LIBRARY_SOURCE` в `tools/assets/sync.mjs`).

Если в проекте SVGR на все `*.svg`, импорт даст компонент — `Icon` принимает и его (`src={Arrow}`).

**5. `<Container/>` удалён** (`@deprecated` с 1.x). Колонку даёт проп `container` у `Box`, `Flex`,
`Grid`: те же поля по бокам и `max-width`, но **без вертикальных полей** — их задаёт секция. Замена
«один в один» (вертикальные поля сохраняются, `pt`/`pb` на вызове их перебивают, как раньше) — свой
компонент в проекте, импорт на вызовах не меняется:

```tsx
// libs/shared/ui/src/lib/components/Container/Container.tsx (socrat); алиас @socrat/shared/ui/container → сюда
import { Box, cx, type BoxProps } from '@delba/ui';
import styles from './Container.module.scss';

/** Колонка контента с полями `--s-container` со всех сторон — как `<Container/>` кита 1.x. */
export const Container = ({ className, ...props }: BoxProps) => <Box container className={cx(styles.root, className)} {...props} />;
```

```scss
// Container.module.scss — в слое покоя, чтобы проп pt/pb (ui.utilities) его перебивал
@layer ui.components {
  .root { padding-top: var(--s-container); padding-bottom: var(--s-container); }
}
```

Где вертикальные поля не нужны (секция задаёт свои) — прямо на вызове: `<Container …>` → `<Box container …>`
(или `<Flex container …>`/`<Grid container …>`, если внутри одна раскладка — тогда обёртка лишняя).

**6. `controls/Button`** (реэкспорт `Button`) удалён — `import { Button } from '@delba/ui'`.

## Миграция договора темы

**2026-09-23 — статусы по смыслу, роли бренда не заняты служебным.** В теме проекта:

| Было | Стало |
|---|---|
| `--red`, `--error-color` | `--error` |
| `--red-light` | `--error-light` |
| `--green`, `--success-color` | `--success` |
| `--yellow` | `--warning` |

`--secondary` / `--secondary-hover` кит больше не читает (плейсхолдеры, текст `Select`, disabled
`Button`, бегунок `SwitchButton` → `--text-muted`), рамка `SwitchButton` вместо `--tertiary` — `--line`.
`check-tokens.mjs` узнаёт старые имена и подсказывает замену; таблица — `RENAMED` в нём.

## Отложено (решение владельца 2026-09-23)

- ~~**Раскладка по папкам и карта `exports`.**~~ Сделано в 2.0: `src/components`, `src/core`,
  `assets`, пакет `@delba/ui` (см. «Переход на 2.0»). Переименование репозитория в `delba-ui` — уже.
- ~~**`<Container/>` устарел.**~~ Удалён в 2.0, замена — проп `container` у Flex, Grid и Box.
- ~~**Иконки кита — импортом.**~~ Сделано в 2.0: `assets/` импортом, копия в `public/` не нужна.
