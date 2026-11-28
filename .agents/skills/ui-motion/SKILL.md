---
name: ui-motion
description: 'Изменять и проверять анимации, переходы, collapse, reveal и parallax в Frontend.'
---

# Движение Frontend

Прочитай [договор движения](../../../docs/architecture.md#движение-и-первый-показ)
и тип animate самого компонента. Общие timings, easing и defaults принадлежат
[FrontendConfig](../../../docs/configuration.md).

Бери `appearance`, `hover`, `idle` и `change` из общего договора Motion.
Сверяй тип компонента, DOM-хост и клип, а также конкурирующие CSS-свойства.
Специальные эффекты принадлежат своему каналу и компоненту. Примеры —
[каталог](../../../docs/components.md#анимация-компонентов).

Покажи start, end, cancel, reduced motion и повторный запуск. Для collapse и
swap проверь прерывание и последнее состояние, focus и доступность скрытых
детей. Для reveal проверь первый SSR-показ, root наблюдения и загрузку шрифтов.
Используй существующий механизм. Ресурсы фазы освобождаются при завершении,
отмене и unmount. Проверки по [ui-verify](../ui-verify/SKILL.md).
