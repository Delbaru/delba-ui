---
name: ui-motion
description: 'Общая механика анимаций @delba/ui: appearance, content swap, collapse, hover, parallax, perspective и lifecycle. Применять при изменении motion API, хуков и переходов кита.'
---

# Motion UI-кита

Пути — от корня UI-репозитория. Сначала [ui-component](../ui-component/SKILL.md),
затем [authoring §3.1 и §6](../../../docs/authoring.md), нужный раздел
[core](../../../docs/core.md) и существующий хук/компонент.

| Сценарий | Владелец |
|---|---|
| Появление, observer, общая композиция transform | useSharedMotion / useReveal / core/reveal |
| Смена содержимого | useContentMotion и специфичный эффект примитива |
| Сворачивание, команды и итог перехода | CollapseWrap, useCollapseState/Motion/Controls, core/base/collapse |
| Скролл и курсор | useParallaxMotion / usePerspective3dMotion, общие проверки visibility |
| Время, расстояния, reduced motion | core/base/timing, distance, motion и конфиг потребителя |

Перед новым эффектом найди соседний реализованный сценарий и потребителей.
Общий API — объект animate с when/effect; совместимость legacy объясняется отдельно.
Корневой collapse относится ко всему компоненту, объект части — к части.

- Один владелец controlled-состояния; фаза движения не становится второй моделью open.
- DOM ref сохраняет назначение и cleanup; ручка поведения отдельна.
- Callback ref сохраняет идентичность между рендерами, чтобы не сбрасывать движение.
- Пользовательские события компонуются; отмена действия не отменяет обязательный cleanup.
- Обратная команда, cancel и unmount корректно завершают ожидающий результат.
- Reduced motion сохраняет результат и lifecycle; первый SSR и hydration согласованы.
- Пауза вне экрана/скрытого документа и снятие слушателей/observer/rAF обязательны
  там, где механика их создаёт. Не дублируй движок в компоненте.
- Сглаживание учитывает время кадра, а не число кадров; на разных Hz длительность одинакова.
- --t-fast/normal/slow — полный transition с all. Для списка свойств используй
  transition-property отдельно; `height var(--t-normal)` — некорректный CSS.

Проверяй быстрый разворот, смену контента посреди хода, повторное открытие, callback один раз,
фокус, portals, controlled-отказ, reduced motion и unmount. Используй существующие
unit/browser/SSR fixtures; добавляй тест на установленный баг, без второго runner.
Покадровая работа или торможение → [ui-performance](../ui-performance/SKILL.md), приёмка →
[ui-verify](../ui-verify/SKILL.md). Визуал подтверждается в настоящем потребителе.
