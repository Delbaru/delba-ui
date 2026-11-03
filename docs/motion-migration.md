# BREAKING: единый объектный animate

Согласовано владельцем 2026-11-02: публичные `animation`, `transitionKey`, `reveal`,
строковые и tuple-значения анимации удалены. Переход выполняется вместе с
потребителями; наличие этой миграции не подтверждает опубликованную версию пакета.
Геометрические responsive-кортежи и кортеж источников Img не меняются.

| Прежняя запись | Текущий договор |
| --- | --- |
| `reveal="up"` | `animate={{ when: 'inView', effect: 'up' }}` |
| `reveal={['up', { start: 'load', delay: 0.1 }]}` | `animate={{ when: 'load', effect: 'up', delay: 0.1 }}` |
| Flex/Box `animate={['fadeInUp', { key }]}` | `animate={{ when: 'change', effect: 'up', key }}` |
| Flex `animation="fadeIn"` | `animate={{ when: 'load', effect: 'fade' }}` |
| Icon `animate={['spin', options]}` | `animate={{ when: 'change', effect: 'spin', ...options }}` |
| Img `animate={['veil', options]}` | `animate={{ when: 'change', effect: 'veil', ...options }}` |
| Text `animation={['counter', { trigger: 'onLoad', ...options }]}` | `animate={{ when: 'load', effect: 'counter', ...options }}` |
| Text `animate={['textSlide', { mode: 'swap' }]}` | `animate={{ when: 'change', effect: 'textSlide' }}` |
| Text hover-слайд | `animate={{ when: 'hover', effect: 'textSlide' }}` |
| Text/LexicalText `[textClip, { steps, currentStep }]` | `animate={{ when: 'change', effect: 'textClip', steps, currentStep }}` |
| Modal `animation="fadeInDown"` | `animate={{ when: 'open', effect: 'down' }}` |

Для прежнего `fadeInDown` выбери `down`, для `fadeInScale` — `scale`.
В Flex/Box смена содержимого требует `key`; появление `load/inView` ключа не требует.
`duration` и `delay` — секунды либо имя `ui.config.motion.timing`. У Icon duration
относится к каждой из двух фаз. В Text counter `onView` становится `inView`,
`onLoad` — `load`; смена текста и hover выбираются отдельными событиями.

Responsive-анимация текста больше не выбирает скрытую desktop-ветку старого tuple.
Последовательность `steps/currentStep` задаётся одним объектом; responsive остаётся
у типографики и геометрии. Для appearance выбирай событие фактического сценария.

Общий observer, content-swap, text renderers, image/icon swap и CSS keyframes
сохранены. Внутренние normalized options и CSS `animation` не являются публичным
синтаксисом. DOM/ref, фокус, SSR, reduced motion и завершение переходов проверяются
обычными gates; создание второго движка или адаптера старой записи не требуется.

При обновлении проверь TS всех потребителей, первый SSR/гидрацию, быструю смену
key/контента, загрузку новой картинки, open/exit окна и reduced motion. Браузерную
приёмку нельзя заменить поиском старых пропсов или успешными типами.
