# Конфигурация Delba Frontend

Toolkit загружает `delba.config.ts`, выбранное ENV и declarations из публичного
`./module` пакетов. Frontend получает только собственную явно подключённую секцию.
Библиотека не ищет конфиг проекта, не читает ENV-файлы и не владеет registry.

```ts
// configs/delbaFrontend.ts
import type { FrontendConfig } from '@delba/frontend/config';
export const delbaFrontend = {
    theme: {
        sources: ['src/shared/theme'],
        padding: { none: 0, field: [8, 12], panel: [16, 24, 16, 24] },
    },
    typography: ['h1', 'p1'],
} as const satisfies FrontendConfig;

// delba.config.ts — композиция, которую читает только Toolkit
import { delbaFrontend } from './configs/delbaFrontend';
export default { delbaFrontend };

// next.config.ts — native-интеграция без Toolkit runtime
import { withFrontend } from '@delba/frontend/next';
import { delbaFrontend } from './configs/delbaFrontend';
export default withFrontend({}, { settings: delbaFrontend });
```

`FrontendConfig` содержит `theme.sources`, `theme.padding`, `typography`, `motion`,
`scrollbar`, `skins`, `scale`, `images`, `messages`. Пути относительны переданному
host `root`. `theme.sources` — непустой список путей проверки токенов. Значения
`theme.padding` непосредственно поступают в seeds padding-генератора. При отсутствии
настроек применяются собственные предметные defaults библиотеки.

Технические поля `root`, `scan`, `seeds`, `componentAnatomy`, `rules`, `baseline`,
`themeDefaults` и настройки product test runner в авторской секции запрещены.
Отдельных config-loader, `--config`, utilities CLI и bin `delba-frontend` нет.

## Публичный модуль

`@delba/frontend/module` default export объявляет `id: 'delbaFrontend'`,
`command: 'frontend'`, `requires: []` и `configuration.public: []`.
`resolveFrontendConfiguration(settings, rawEnv, { operation, environment })`
валидирует только собственную секцию и возвращает
`{ settings, environment: {}, public: {} }`.

Toolkit передаёт action context с `root`, всей `project`, declaration `package`,
собственными `settings`, typed `environment`, выбранным `env`, `publicEnvironment`,
`modules`, `operation`, `environmentName`, `args` и необязательным `run`.
Frontend использует только нужные ему значения; private imports OS отсутствуют.

| Action | Поведение |
| --- | --- |
| `build` | `prepareFrontend({ root, settings, env? })`: генерация |
| `watch` | `watchFrontend(context)`: генерация и watcher с `close()` |
| `check` | Токены, правила, импорты, анатомия и UI-архитектура потребителя |
| `test` | Только units библиотеки; `--browser` выбирает её fixtures |
| `format` | Host Prettier с аргументами action; по умолчанию `--write src` |
| `startup` | Явный browser-аудит запущенного URL из `context.args` |
| `dev`, `start` | `runFrontendNext(context, 'dev' / 'start')` |

Общий CLI: `delba frontend <action>`. Для Next build владелец приложения вызывает
`runFrontendNext(context, 'build')`. Product Node tests, DB/QA guards и сценарии
приложения принадлежат его модулю и Toolkit runner. Библиотечные suites:
`standard`, `library`, `browser`, `all`; suite `project` удалён.

Rule checks требуют нулевых нарушений действующих правил. Они не читают и не
создают baseline-файлы; `--baseline` и `--update` удалены. `--fix` остаётся явной
операцией форматирования, которая не добавляет исключений правилам.

## Native Next и ENV

`withFrontend(nextConfig, { settings, root? })` требует переданные настройки;
`root` по умолчанию равен cwd native Next. Плагин и module actions вызывают
один owner API генерации. После успешной генерации переданный `env` получает
`DELBA_FRONTEND_OWNER`, чтобы дочерние Next workers не повторяли её.
Владелец перезапускает watcher после изменения настроек; библиотека не следит
за неизвестным ей графом project config.

Node-only `@delba/frontend/next-env` экспортирует
`prepareNextEnvironment(env = process.env)`. Host вызывает его до native Next CLI
или server bootstrap. Helper адаптирует уже выбранное окружение через тот же
экземпляр `@next/env`, что использует host Next: обновляет initialEnv, сбрасывает
старое окружение и выставляет `__NEXT_PROCESSED_ENV`. Он не загружает dotenv.

`DELBA_PUBLIC_ENV` — JSON-словарь только явно разрешённой module public projection
со значениями string/number/boolean/null. Next получает их строковое представление,
включая строку `'null'`. Любой host `NEXT_PUBLIC_*`, отсутствующий
в projection, вызывает ошибку. Плагин передаёт в Next `env` только projection;
server ENV туда не копируется. Переопределение её значений в `nextConfig.env`
не применяется, а ключ вне projection отвергается.

`runFrontendNext` запускает child с переданным `context.env`, готовит окружение
до импорта native Next CLI и передаёт `context.args` как аргументы Next.
Production bootstrap импортирует этот helper и собственные runtime resolvers,
без Toolkit. Прямые функции генераторов остаются доступны внутри библиотеки
для её standalone tooling с явными настройками или собственными defaults.

Приёмка исходников покрывает own settings, отказ legacy-полей, обязательные
Next settings, public projection, передачу padding и отсутствие project loading.
Runtime-проверки этого пакета отложены по отдельному решению владельца.

## Theme assets

`generateThemeAxes({ root, directory, source, rebuildCommand?, fills, lines, texts,
iconColors, fillClass?, borderClass?, textClass? })` пишет `_axes-tokens.scss` и
`_axes-classes.scss` в явно указанную папку и возвращает число изменённых файлов.
Ключи словарей типизируют callback selectors; данные и пути остаются у приложения.
Renderer общий с библиотечным генератором skins. Линия принимает также третий
элемент border style. `source` и `rebuildCommand` служат заголовку, файл source
не загружается библиотекой.

`vendorEmojiAssets({ root, emojis, directory, manifest })` обслуживает переданную
палитру: pinned Twemoji revision, проверку безопасных SVG, hashes, attribution и
license. Приложение владеет каталогом emoji и путями outputs. Это явная maintenance
операция с сетью, она не включается автоматически в build/check/test.
