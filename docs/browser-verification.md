# Браузерная приёмка DelbaUI

Этот guide описывает особенности кита. Общий порядок browser QA и выбор инструмента —
в shared `delba-browser`, обязательный профиль проверок — в
[ui-verify](../.agents/skills/ui-verify/SKILL.md). Проверяй установленную версию
потребителя: документация текущего checkout не обновляет её API.

## Fixture и checkout

Работай в согласованном checkout, без новых worktree и клонов. Перед запуском,
перезапуском или выбором порта используй `dev-launcher` и фактический status
этого checkout. Переиспользуй его fixture; её порт передай как `UI_BROWSER_PORT`.
Не обходи [global setup](../tools/browser/global-setup.ts): HTTP 200 ещё не
подтверждает `kitRoot` из `/__ui_fixture__`. При чужой fixture выясни владельца
через launcher, сохрани чужой процесс и согласуй запуск нужного приложения.
Не выбирай новый порт автоматически и не запускай вторую копию ради зелёного gate.

## Reveal: цель, появление и окончание

Публичный вход — объектный `animate` с `when`/`effect`; `reveal` — название
внутренней механики, а не инструкция вернуть legacy prop.
[useReveal](../src/hooks/useReveal.ts) связывает корень с
[observer](../src/core/reveal/observer.ts) и
[CSS](../src/core/reveal/_reveal.scss). Перед действием установи три разных факта:

- Геометрия: целевой узел пересекает нужный viewport с учётом clipping предков.
  Reveal observer использует viewport документа, `threshold` и `rootMargin`;
  сам по себе bounding rect не подтверждает видимость содержимого.
- Видимость: фактические opacity, translate/scale/filter цели и её предков.
  При stagger состояние получают прямые дети, собственный Reveal ребёнка и
  `data-reveal-skip` исключают его из родительского каскада.
- Фаза: без `data-reveal-state` возможен SSR hold; `wait` ждёт пересечения,
  `in` включает ход с delay, `done` освобождает узел от entry animation.
  Controlled-путь пишет `in`/`out` и не использует observer; `start: load`
  запускается CSS с первой отрисовки. Поэтому ожидание `done` подходит не всем путям.

Прокрути действительный контейнер к цели и наблюдай её естественное появление.
Если цель осталась скрыта, диагностируй observer, состояние предков, CSS и timing.
Forced click, запись `data-reveal-state` или глобальное отключение animations
не подтверждают исправление Reveal. Reduced motion проверяется отдельным сценарием.
Проверка позднего конечного состояния не доказывает первый показ: задержанная
гидрация может уже застать завершившийся hold и сразу оставить контент видимым.

## Прокрутка

[ScrollArea](../src/components/ScrollArea/ScrollArea.tsx) — сам scroll viewport:
ref и DOM-события относятся к его корню `data-scroll-axis`, без дополнительной
внутренней обёртки. Найди реальный scroll owner по overflow и размерам; для
вложенного viewport проверь его позицию отдельно от `window.scrollY`.
[useInView](../src/core/useInView.ts) поддерживает явный `root` и до первого
callback по умолчанию возвращает false; этот hook и Reveal имеют разные договоры.
Для адресной команды вложенного оглавления используй публичный `scrollTo` с
`container`; независимость от документа и соседних viewport проверяй отдельно.
Native scrollbar требует видимой полосы и реального drag: computed CSS не
подтверждает отрисовку. Особый headless-флаг описан в ui-verify.

## Portals и overlays

[Dropdown](../src/components/Dropdown/Dropdown.tsx) может переносить панель
в portal, [ModalProvider](../src/components/Modal/ModalProvider.tsx) размещает
стек в `document.body`. Ищи открытую поверхность по реальному DOM и её смыслу,
не только внутри DOM-предка trigger. Сверяй `aria-expanded` trigger и состояние
панели; mounted панель может быть закрыта или `inert`.
[ModalSurface](../src/components/Modal/ModalSurface/ModalSurface.tsx) имеет
`role=dialog`, `aria-modal` и отдельный scroll viewport. Закрывающаяся модалка
остаётся в стеке до exit, сохраняя scroll lock. После закрытия проверь завершение
ухода, восстановление прокрутки и фокуса; вложенные overlays — с верхним слоем.
Позицию floating-панели проверяй после вложенной прокрутки: её
[позиционирование](../src/hooks/useAnchoredFloating.ts) учитывает scroll capture
и transformed containing block даже для fixed strategy.

## Motion

Для перехода зафиксируй начало, промежуточное состояние и результат. Размер
окрашенного контейнера и движение детей проверяются отдельно; правильный fade
не подтверждает collapse geometry. Для быстрых разворотов и коротких состояний
поставь единый наблюдатель до ввода, чтобы последовательные замеры не пропустили
кадр. Повтори относящиеся сценарии с reduced motion и unmount. Полный договор —
[ui-motion](../.agents/skills/ui-motion/SKILL.md); DOM snapshot, screenshot и
настоящий ввод подтверждают разные части приёмки.
