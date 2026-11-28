# @delba/frontend

Frontend — общая UI-библиотека. Продуктовые роли, словари и тема принадлежат
потребителю. Перед изменениями прочитай [архитектуру](docs/architecture.md)
и профиль задачи. [README](README.md) даёт карту четырёх документов.
Публичные props и exports сверяй с текущим кодом.

## Навыки

Применяй установленные shared `delba-workflow`, `delba-grilling`,
`delba-report` и `delba-verify`. Новые задачи сначала согласуй с владельцем.
Согласованный поднабор выполняй без повторного обсуждения каждого шага.
Работай в существующем checkout, один writer на файл, сохраняй чужие изменения.

| Работа | Локальный профиль |
| --- | --- |
| Компонент, props, SCSS или ядро | [ui-component](.agents/skills/ui-component/SKILL.md) |
| Переход, collapse, reveal или parallax | [ui-motion](.agents/skills/ui-motion/SKILL.md) |
| Прокрутка, время кадра или память | [ui-performance](.agents/skills/ui-performance/SKILL.md) |
| Source review или исполняемая приёмка | [ui-verify](.agents/skills/ui-verify/SKILL.md) |

Перед изменением Next API прочитай соответствующий локальный guide в
`node_modules/next/dist/docs/`. Потребители используют shared `delba-ui` и свой профиль.
Новый или изменённый публичный компонент отражай в [каталоге](docs/components.md).

Текущие разрешения, структура файлов, раскладка тестов и приёмка —
[разработка](docs/development.md). Работа в `work/refactor` остаётся в Changes.
Stage, commit, push, публикация, новые ветки, worktrees и клоны требуют отдельного
поручения. Не запускай сервисы и проверки в текущем SOURCE ONLY.
