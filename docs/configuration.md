# Визуальный конфиг Frontend

Приложение передаёт один полный `FrontendConfig` из `@delba/frontend/config`.
Toolkit загружает корневой config и выбранное окружение. Frontend получает
свою секцию и явный `root`. Полный [starterFrontend](../tools/visual/starter.ts)
служит самостоятельным примером и fixture библиотеки. Конфиг приложения
содержит собственные значения и не дополняется стартером.

```ts
import { withFrontend } from '@delba/frontend/next';
import { delbaFrontendConfig } from './configs/delbaFrontend';

export default withFrontend({}, { settings: delbaFrontendConfig });
```

При использовании Toolkit та же ссылка указывается в `delba.config.ts` как
`delbaFrontend: delbaFrontendConfig`. Секция содержит все обязательные поля.

| Поле | Авторские данные |
| --- | --- |
| `responsive` | Три возрастающие полосы mobile/tablet/desktop с `minWidth`, `designWidth` и `scale`. На desktop также `scaleLimit`. |
| `fonts` | Именованные family/fallback/faces, `primary` обязателен. Для системного шрифта faces пуст. |
| `colors` | primary/secondary со всеми normal/hover/pressed/foreground. surface/text/line/error/warning/success/info и дополнительные роли. |
| `gradients` | Именованные CSS-градиенты. Допустим пустой словарь. |
| `typography` | body/caption/micro/title и дополнительные роли. Каждая содержит fontFamily/fontSize/fontWeight/lineHeight/letterSpacing/textTransform. |
| `geometry` | Именованные dimensions, positions, radii, padding, lines и shadows. `spaces` — необязательный словарь семантических отступов. |
| `motion` | Полный timing/defaults/carousel/easing/visibility/inView/scroll/distance. |
| `variables` | Дополнительные CSS-переменные. Строка, RPX-число или строгая адаптивная тройка. |
| `scrollbar` | Все width/color/trackColor/inset/gutter/autoHide/hideDelay/showDuration/fadeDuration. |
| `images`, `messages` | Необязательные политики изображений и текстов UI. |

Начальная ширина mobile равна 0. `scale: 'fixed'` даёт 1 RPX = 1 px.
`'fluid'` масштабируется относительно `designWidth` с `scaleLimit` на desktop.
Media, JS breakpoints, CSS RPX и image sizes используют эти настройки.

Все адаптивные props и шесть полей каждой роли typography используют ровно
`[desktop, mobile, tablet]`. `null` пропускает значение или CSS-декларацию в своей
полосе. Полоса без значения не получает desktop автоматически. Неадаптивный
prop сохраняет собственный тип. Font family указывает на роль `fonts`, CSS
стек публикуется как `--font-family-<role>`. Типографика использует отдельные
`--type-<role>-<field>`, поэтому каждое поле может независимо пропустить полосу.

Числовые длины означают RPX без объекта-обёртки. Обычная геометрия кратна 4,
верхнего лимита нет. Font size, letter spacing, толщина border и scrollbar,
точные детали отрисовки и измеренный DOM допускают дробную геометрию.
Вес, время и коэффициенты сохраняют собственные единицы. В `variables`
безразмерные значения передаются строкой, число означает длину.
Обязательны `padding.none = 0`, `radii.none = 0` и `radii.sm`.
Padding допускает число, две или четыре стороны, lines — [толщина, цвет, стиль?].
Авторские словари описывают семантические роли, например `spaces.section = 160`.
Числовые ключи в `spaces` недопустимы. Для CSS Frontend генерирует только
числовые `--s-N`, на которые статически ссылаются исходники приложения,
библиотеки или переданный config. Props используют числовую длину напрямую,
например `w={[4000, null, null]}`.

Дополнительный цвет — CSS-строка, включая `light-dark(...)`, или объект
интерактивных состояний. Имена camelCase переходят в kebab-case, например
`primary.normal` даёт `--primary`. Имена управляемых переменных зарезервированы.

Длительность в типе `MotionTime` задаётся числом секунд или именем из
`motion.timing`. CSS и JS используют эту шкалу. Отдельные механизмы уточняют
доступные настройки в своих типах. Общие значения свечения хранятся в
`motion.defaults.surfaceIdle.duration` и `motion.defaults.surfaceIdle.strength`.
После изменения авторского конфига подготовь актуальные проекции темы и motion.

Плавная прокрутка Flex берёт общие значения из `motion.scroll`. Для отдельной
области можно переопределить `lerp`, `duration`, `offset` и `easing` в
`ui.scroll` с пресетом `smooth`. Если фиксированная длительность отсутствует,
движок рассчитывает её по расстоянию и границам `minDuration`, `maxDuration`
и `durationPerScreen`. Длительность указывается в секундах.

## Генерация и стили

`prepareFrontendSources({ root, settings })` создаёт производные CSS, Sass
и TypeScript для темы, responsive, typography, skin, motion, images, messages,
scrollbar и icons. Это подготовка импортируемых исходников. Одновременные
вызовы с тем же root и identity settings объединяются до завершения.
`prepareFrontend` вызывает эту подготовку и дополнительно генерирует sparse
utilities. `watchFrontend` возвращает `close()`, host пересоздаёт подписку при
смене settings. Native test/typecheck actions явно готовят source-зависимость.

UI entrypoints импортируют основу стилей автоматически. `withFrontend`
подготавливает проекции перед Next dev/build и включает их в native сборку.
Слой `ui.base` берёт палитру body и типографику body и заголовков из
авторского конфига. Reset и поведение нативных элементов подключаются
тем же входом. Геометрия шапки и других частей страницы задаётся их владельцами.
Приложение не добавляет ручной импорт generated CSS и не переписывает layout
для доставки стилей. Для других native hosts есть `styles.scss` и `theme.css`.
Производные файлы игнорируются Git, их создаёт bootstrap.

`@delba/frontend/theme` экспортирует `theme` и типы
`Fill`, `Border`, `TextColor`, `IconColor`, `Radius`, `Size`, `Pad`, `FontName`.
`theme` публикует fills/texts/iconColors/lines/radii/paddingValues,
списки имён, padding/radius/fillClass/borderClass/textClass.

```scss
@use '@delba/frontend/skin-states' as theme;

.title {
  @include theme.typography-role(title);
}

.preview {
  @include theme.typography-device(mobile);
}
```

`typography-role($role)` выпускает свойства под штатными media. Второй аргумент
выбирает одну полосу для preview. `typography-device` применяет переменные
выбранной полосы и fixed RPX. `breakpoint($device)` использует те же границы.

## Node и Next

`@delba/frontend/module` объявляет `delbaFrontend` / `frontend`, `requires: []`
и пустую public ENV projection. Module actions принимают явные root, settings,
env и args. Входы — prepare/build/watch/check/test/format/dev/start.
У Node API есть `runFrontendNext(context, 'dev' | 'build' | 'start')`.

`@delba/frontend/next-env` применяет уже выбранное host окружение через singleton
`@next/env`. `DELBA_PUBLIC_ENV` содержит только явно переданные scalar JSON
значения string/number/boolean/null. Next получает их как строки.
Непроецированные `NEXT_PUBLIC_*` и посторонний `nextConfig.env` отклоняются.
Production bootstrap использует native helper и runtime resolvers приложения.

`vendorEmojiAssets({ root, emojis, directory, manifest })` — явная операция
обслуживания pinned Twemoji SVG, лицензии и хэшей. Каталог и набор принадлежат
приложению. Операция вызывается отдельно от build/check/test.

Точная схема — [tools/config.ts](../tools/config.ts). Runtime-приёмка текущего
пакета описана в [development.md](development.md).
