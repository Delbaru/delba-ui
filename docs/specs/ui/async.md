# Async

`ui.async.use(source, timing)` and `Flex ui={{ async: { preset: 'default', from: source } }}` use the same source-state and loading-phase logic. Current-argument data takes precedence; only network failures may retain current data. Owners provide scoped data and optional loading/error/empty content. DelbaOS DAsync remains a visual adapter for product skeletons and translations. Background refresh does not replace confirmed children. Timing is in milliseconds. React/browser verification remains required.

Flex without async options does not subscribe to the reduced-motion media query
for this mechanism or schedule its phase timers. Other motion owners are unchanged.

An explicit `source.empty: true` marks successful empty/undefined data (unless
initial loading is still active). Undefined `currentData` without that flag
still never falls back to a different argument. Errors without retainable
current data take precedence over the loading phase.

## Завершённая семантика ошибки

- Ошибкой считается любое значение, отличное от `null` и `undefined`; `''`, `0` и `false` не должны маскироваться под бесконечную загрузку.
- `ui.async.use` и чистый source-state возвращают исходный `error` без преобразования и явный `hasError`; адаптеры используют этот флаг вместо truthiness. `AsyncOptions<T = unknown>` сохраняет тип данных в `from: AsyncSource<T>`.
- `currentData` остаётся единственным источником текущего query result; fallback на устаревший `data` не выполняется.
- Background network failure может оставить текущие данные на экране; остальные ошибки заменяют content error-state.

