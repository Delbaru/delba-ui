# components — общая UI-библиотека

Примитивы дизайн-системы (`Flex`, `Grid`, `Text`, `Icon`, `Img`, `Button`, `Modal`, `Select`,
`Input`…) и хуки, на которых они держатся. Подключается в проект git-сабмодулем. Каждый проект
закреплён на своём коммите и обновляется, только когда сам решит.

**История этого репозитория не переписывается** (никаких force-push): проекты ссылаются на
конкретные коммиты, и стёртый коммит ломает их свежий клон.

## Правишь библиотеку?

Этот README — для тех, кто библиотеку ПОДКЛЮЧАЕТ. Кто её ПРАВИТ, читает [`CLAUDE.md`](CLAUDE.md)
(маршрутизация и красные линии) и [`docs/Library.md`](docs/Library.md) (навигатор по справочнику:
авторинг, ядро, приёмка, журнал грабель).

## Граница

Ни один файл отсюда не импортирует ничего снаружи этой папки. Всё продуктовое — скины,
пресеты, `Shared*`-компоненты, словари, значения токенов — живёт в проекте. Сторож:

```bash
node <путь>/UI/tools/check-boundary.mjs
```

## Подключение

```bash
git submodule add -b main https://github.com/Delbaru/delba-ui.git <путь>/UI
```

Клонировать проект вместе с библиотекой: `git clone --recurse-submodules …`. Если проект уже
склонирован: `git submodule update --init`.

**Next** — плагин [`next.mjs`](next.mjs), больше ничего запускать не нужно:

```js
// next.config.mjs
import { withUi } from '<путь>/UI/next.mjs';
export default withUi(nextConfig);
```

Он ставит `sassOptions` (modern API и `loadPaths`, чтобы модули звали ядро коротким
`@use 'UI/core/mixins'`) и зовёт генерацию [`tools/cli.mjs`](tools/cli.mjs): в `next build` — один
раз до сборки, в `next dev` — сборка и watcher, который умирает вместе с dev. Проверки —
`node <путь>/UI/tools/cli.mjs check` из папки приложения.

**CLI** (из папки приложения, конфиг — `ui.config.ts` рядом, пример — `site/ui.config.ts` в
serdcaBezGranic):

```bash
node <путь>/UI/tools/cli.mjs build   # public кита → public приложения, шкуры, утилиты
node <путь>/UI/tools/cli.mjs watch   # то же и следит; правка конфига или пресета — перезапуск
node <путь>/UI/tools/cli.mjs check   # красные линии (--update опускает планку) и договор темы
```

Конфиг ([`tools/config.ts`](tools/config.ts)) — всё необязательно: `scan` (`['src']`, кит
сканируется всегда), `seeds`, `public` (`public`), `theme` (`theme`), `rules` (`['src']`),
`baseline` (`.rules-baseline.json`), `skins`, `scale` (базы масштаба, см. ниже). Проекту нужны `typescript` и `tsx`.

## Что должен дать проект

- **Пакеты** — `peerDependencies` в [`package.json`](package.json). Там же `sideEffects`:
  благодаря ему сборка выкидывает со страницы то, что она не использует (Lexical, Swiper,
  видеоплеер), даже если импорт идёт через общий вход.
- **Генераты.** `core/_utilities.scss` (классы под значения, которые реально встречаются в коде) и
  `core/_field-sizes.scss` пишет генератор утилит [`tools/utilities`](tools/utilities). Без них
  сборка стилей не пройдёт, в репозиторий они не попадают: у каждого проекта свои. Их делает CLI
  выше; проект со своим скриптом зовёт генератор напрямую:

  ```bash
  node --import tsx <путь>/tools/utilities/cli.ts build --config <конфиг проекта>   # или watch
  ```

  Конфиг — `{ scan: ['apps', 'libs'], seeds? }`, пути от cwd, пример — `tools/ui/utilities.config.ts` в socrat.
- **Масштаб.** `1rpx = ширина окна / база полосы`, на десктопе шире потолка rpx не растёт. Базы —
  `scale` в `ui.config.ts` (умолчания `{ mobile: 320, tablet: 768, desktop: 1920, max: 2560 }`); генератор
  пишет из них `--base-width`/`--rpx` (`core/_scale.scss`, слой `ui.scale` — тема проекта со своим `--rpx`
  его перебивает) и `core/scale.ts` для JS. По тем же числам `Img` считает `sizes`: `w={624}` →
  `(min-width: 2560px) 832px, 32.5vw`. Тема проекта `--rpx` больше задавать не должна.
- **Подключить [`core/tokens.global.scss`](core/tokens.global.scss) в глобальные стили** (`@use`): там
  утилиты раскладки и классы примитивов `ui-*` (`ui-flex`, `ui-text`, `ui-icon`…). У примитивов нет
  CSS-модулей, без этого файла они голые.
- **Статику из [`public/`](public).** Там иконки, которые компоненты зовут по адресу
  (`/icons/ui/…`: глаз в поле пароля, стрелки календаря, кнопки видеоплеера, тост). CLI
  раскладывает её сам; без него проект копирует `public/` библиотеки в `public/` приложения.
- **Шкуры — по желанию.** Движок [`skin/`](skin) (`defineSkin`, `resolveSkin`, `skinPad`,
  `skinRadius`, импорт `<алиас>/skin`) для компонентов проекта с пресетами. Данные — у проекта:
  в `skins` конфига словари `fills`/`lines`/`texts` и `dir` с компонентами, где лежат
  `*.skin.ts`. Генератор пишет `skin/_tokens.scss`, `skin/_classes.scss` (классы покоя `sk_*` —
  `@use` в глобальные стили) и `_states.scss` рядом с каждым компонентом (`@use './states'` в его модуле).
- **Тему.** Договор — это CSS-переменные, семейства типографики и атрибутные правила
  (`[data-hide-mobile]`…), которые библиотека берёт у проекта. Проверка:

  ```bash
  node <путь>/UI/tools/check-tokens.mjs <папки стилей проекта…>    # чего не хватает
  node <путь>/UI/tools/check-tokens.mjs --list                     # весь договор
  ```

  Цвета договор называет ролями. Бренд — `--primary` (+ `-hover`, `-light`, `-dark`) и
  `--tertiary` (только `Button variant="tertiary"`); статусы — `--error`, `--error-light`,
  `--success`, `--warning`; нейтральные — `--background`, `--text`, `--black` (чернила полей),
  `--text-muted` (приглушённый текст, плейсхолдер, disabled), `--line` (линии и рамки), `--white-*`.
  Служебное роли бренда не занимает: `--secondary` проект может отдать под бренд целиком.

  Для нового проекта есть стартовая тема [`theme/tokens.default.scss`](theme/tokens.default.scss):
  подключи её в глобальные стили, и библиотека заработает сразу. Специфичность у неё нулевая,
  так что своя тема проекта перебивает её при любом порядке подключения.

## Словари — у проекта

`LexicalTextarea` не знает, какие бывают переменные. Проект передаёт их в `variables`, и у
каждой переменной своя иконка (`icon`) — библиотека больше не подставляет её по ключу.

## Проверки качества

Всё ниже запускается из корня проекта, `<путь>` — папка библиотеки.

```bash
npx tsgo -p <путь>/tsconfig.json --noEmit            # строгий TypeScript самой библиотеки
node --import tsx --test "<путь>/**/*.test.ts"       # юнит-тесты ядра
node <путь>/tools/check-boundary.mjs                 # ни одного импорта наружу папки
node <путь>/tools/check-tokens.mjs <стили проекта…>  # договор темы
node <путь>/tools/check-rules.mjs --baseline <файл> <папки проекта…>   # красные линии с храповиком
```

`tsconfig.json` библиотеки строже обычного: помимо `strict` включены `noUncheckedIndexedAccess`,
`noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals` и
`noUnusedParameters`. `any`, `@ts-ignore`, `eslint-disable` и утверждений `!` в коде нет;
`as unknown as` — одно, в точке стирания типа реестра анимаций `Text` (`defineAnimation`).

`check-rules.mjs` считает нарушения красных линий в коде ПРОЕКТА (сырые `<button>`/`<input>`/`<a>`,
инлайн-`<svg>`, условный рендер без анимации, числа мимо сетки 4, транзишны без токенов,
`@media`). Планка лежит в проекте; сборка падает, только если нарушений стало больше.

## Обновление в проекте

```bash
git -C <путь>/UI pull origin main
npm run ui:build && npm run typecheck
git add <путь>/UI && git commit -m "UI: обновить библиотеку"
```

Правка изнутри проекта: в папке сабмодуля `git switch main` → правка → коммит и пуш сюда →
в проекте закоммитить сдвиг ссылки.

## Совместимость

- **Добавлять, а не переименовывать.** Новый проп или вариант не ломает никого. Если ломаешь,
  помечай коммит `BREAKING:` и пиши в нём «как перейти».
- **`null` в кортеже `[desktop, mobile, tablet]`** значит «пропустить брейкпоинт», а не
  «унаследовать desktop».

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

- **Раскладка по папкам и карта `exports`.** Примитивы — в `src/components`, ядро и хуки — в
  `src/`, `public` → `assets`; проекты импортируют только объявленные входы (`@delba/ui`,
  `/mixins`, `/next`, `/skin`), тогда внутренняя раскладка больше никого не ломает. Один
  `BREAKING:` для socrat и D4Y — в одной серии с переименованием в `delba-ui`.
- **Иконки кита — импортом**, чтобы проекту не нужно было копировать `public/` кита в свой.
