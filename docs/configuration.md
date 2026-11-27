# Конфигурация Delba Frontend

Публичный тип авторских настроек: `FrontendConfig` из `@delba/frontend/config`.
Единственный вход CLI и `withFrontend` — секция `delbaFrontend` в default export
файла `delba.config.ts`.

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

// delba.config.ts
import { delbaFrontend } from './configs/delbaFrontend';
export default { delbaFrontend };
```

`theme.sources` — непустой список путей темы для проверки токенов.
`theme.padding` — необязательный словарь чисел, пар и четвёрок чисел в rpx;
CLI передаёт его значения непосредственно генератору padding-утилит. Имена
словаря доступны приложению из того же конфига; импортировать словарь приложения
в библиотечные инструменты не нужно. Если `theme` не задана, инструменты используют
внутренний путь `theme`.

Также поддерживаются `typography`, `motion`, `scrollbar`, `skins`, `scale`,
`images` и `messages`; их предметные типы определены в `tools/config.ts`.
`root`, `scan`, `seeds`, `componentAnatomy`, `testConditions`, `testConcurrency`,
`checkConcurrency`, `rules`, `baseline` и `themeDefaults` не являются авторскими
настройками. Сканирование `src`, baseline и single-config-анатомия D-компонентов
принадлежат внутренней политике инструментов.

## Поиск и корень

Поиск поднимается от cwd к ближайшему `delba.config.ts`, останавливаясь на
границе checkout (`.git`, включая gitfile) и собственного корня библиотеки.
Явный `--config path/to/delba.config.ts` выбирает файл за пределами cwd.
Корень приложения и все относительные пути всегда определяются директорией
выбранного `delba.config.ts`. Поле `root` не поддерживается.

`ui.config.ts`, прямой объект UI-настроек, секция `ui` и выбор `profile`
не поддерживаются. Найденный конфиг без объектной секции `delbaFrontend`
вызывает ошибку. `loadProjectConfig({ config: null })` отключает поиск приложения
для standalone-инструментов, сохраняя TS runtime.

```ts
import { withFrontend } from '@delba/frontend/next';
export default withFrontend({}, { config: './delba.config.ts' });
```

## Node-only loader

`@delba/frontend/config-loader` экспортирует `resolveConfigFile({ cwd, config })`
и `loadProjectConfig({ cwd, config })`. Загруженная сессия содержит `project`
(всю композицию), `value` (только `delbaFrontend`), `root`, `file`, `files`
(граф импортированных файлов), `importModule(relativePath)` и асинхронный `close()`.
Пути `importModule` отсчитываются от конфигурационного файла. Проекции, включая
callback identity, читай через эту сессию до её закрытия. Каждую сессию закрывай
после использования; новая сессия перечитывает авторские фрагменты.

Loader владеет исполнением TS, графом зависимостей и корнем приложения;
предметные настройки других секций композиции валидирует приложение.
Не импортируй loader в браузер: клиентские модули получают свои безопасные
фрагменты напрямую. Этот API не зависит от сайта или CMS.

## Настройки проверочного runner

`uiCheckSteps` и `runUiChecks` принимают технические настройки отдельно от `config`:

| Option | CLI `delba-frontend test` | Env / default |
| --- | --- | --- |
| `testConcurrency` | `--test-concurrency 1..16` | `DELBA_TEST_CONCURRENCY`; CI: 2, иначе Node default |
| `testConditions` | повторяемый `--test-condition name` | нет, массив условий Node для тестов потребителя |
| `checkConcurrency` | `--check-concurrency 1\|2` | `DELBA_CHECK_CONCURRENCY`; 1 |

Явный option/CLI имеет приоритет над env. Некорректная concurrency вызывает
ошибку; DB-флаги CRM не меняют её автоматически. Библиотечные тесты сохраняют
собственную политику Node concurrency (CI: 2). Остальные options (`suite`, `shard`,
`typecheckCache`, `failedOnly`, `reportFile`, `fix`) сохраняются.

Для DelbaOS владельцем запуска служит `tools/verification/run.mjs root --plan`:
он возвращает `{ files, nodeArgs }` без environment или секретов. Библиотека
проверяет форму плана и передаёт owner `nodeArgs` без переопределения concurrency
или preload; `testConditions` могут добавлять условия Node. `testConcurrency`
библиотеки задаёт параметры остальных потребителей. OS сохраняет собственные
native serial policy и запрет внешних интеграций в принадлежащих ей arguments.

Приёмка договора: CJS/ESM composition сохраняет callback identity и перезагрузку
фрагментов; вложенный cwd не меняет root; legacy-входы отвергаются; standalone
не подхватывает родительский конфиг; token checks используют `theme.sources`,
padding-генерация — значения `theme.padding`; concurrency задаётся runner.

Отдельный `tools/utilities/cli.ts build|watch [--config path/to/delba.config.ts]`
использует тот же loader, корень и словарь padding. Самостоятельный
`utilities.config.ts` и отдельная форма `{ scan, seeds }` больше не поддерживаются.
В watch изменение конфига или его импортированных фрагментов требует перезапуска
процесса, как изменение самого генератора.
