# Frontend verification

## 1. Library and consumer ownership

`pnpm --filter @delba/frontend check` owns the library gate: generation, types,
architecture, boundaries, starter theme and units. `test` runs library units;
`boundary` and `typecheck` remain focused entrypoints.

Toolkit commands `delba frontend build`, `watch`, `check`, `test` receive explicit
settings and selected ENV. No library bin or config-discovery CLI remains.
`delba frontend check` checks consumer UI tokens, rules, imports and anatomy.
`delba frontend test` runs only library checks; `--browser` selects its own
Playwright/SSR fixtures. Product suites, Node conditions, QA guards, native
integration and product typechecks belong to the product module and Toolkit.

Internal `runUiChecks` supports `standard`, `library`, `browser`, `all`, `shard`,
`fix`, `failedOnly` and `reportFile`. `project`, `configArg`, consumer concurrency,
consumer test conditions and consumer typecheck-cache options are removed.
Generation is the required first step. `standard` equals `library`; browser is
explicit. Browser shard syntax remains `index/total`.

```sh
pnpm --filter @delba/frontend check
pnpm --filter @delba/frontend check -- --failed
# From an application with Toolkit:
delba frontend check
delba frontend test
delba frontend test --browser
```

`@delba/frontend/verify` exposes `runNode`, `runNodeTests`, `runSteps` for explicit
owner adapters; it does not discover or orchestrate product tests. Failed-only
runs require matching report/profile and failed state, repeat required preparation,
and preserve independent passed checks. A subset is never full acceptance.

The native Next plugin and module generation share `prepareFrontend`; no separate
CLI preparation exists. Standalone library checks pass `{root: KIT, settings: {}}`.
Settings, host ENV and module actions are documented in [configuration](configuration.md).
Runtime checks for the configuration migration remain deferred by the owner.

## 2. Чек-лист по своему диффу

- [ ] Ни одного импорта наружу папки (сторож молчит)?
- [ ] Новый `var(--…)` добавлен в `theme/tokens.default.scss`?
- [ ] Респонсив-пропы — кортежи, `null` означает пропуск, а не наследование?
- [ ] Нет `any`, `!`, `@ts-ignore`, `eslint-disable`?
- [ ] Покой в `@layer ui.components`, состояния в `@layer ui.states`?
- [ ] Повторяющийся рецепт SCSS взят миксином из ядра, а не скопирован?
- [ ] `z-index` — токен `--z-*`, если речь не о двух соседних узлах внутри компонента?
- [ ] Публичные пропы описаны JSDoc?
- [ ] Ничего публичного не переименовано и не удалено (иначе коммит помечен `BREAKING:`)?
- [ ] Анимация уважает `prefers-reduced-motion`, страховка — `MOTION_END_BUFFER_MS`?

---

## 3. Глазами — на экране проекта

Типы и тесты не видят вид. Компонент проверяется в проекте, который его показывает:

- у socrat есть оракул вычисленных стилей (`tools/visual-oracle`): снимок до, снимок после,
  пустой diff означает «вид не изменился»;
- отдельно снимается оракул СОСТОЯНИЙ (наведение и фокус) — слои и состояния покой не показывает;
- проба мёртвых классов ловит класс, под который никто не сгенерировал CSS.

**Чего проверки НЕ ловят:** клавиатуру, перетаскивание, набор текста и поведение во времени.
Это прокликивается руками.

---

## 4. Правило доклада

Отчитываюсь фактами. Проверка не запускалась — говорю. Упала — показываю вывод. Часть объёма не
сделана — называю, что именно и почему.

Product Node tests and server-only conditions belong to the consuming module and Toolkit runner.

Пути проверяемой темы задаются в `delbaFrontend.theme.sources`. Если тема использует
стартовые токены `@delba/frontend/theme`, включи исходники стартовой темы в этот
список вместе с переопределениями проекта. Переключателя `themeDefaults` нет.
