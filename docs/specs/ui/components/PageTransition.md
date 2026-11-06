# PageTransition

Граница перехода между страницами через React ViewTransition и нативные снимки
браузера. Не создаёт DOM-обёртку, не копирует страницу и не перемонтирует router tree.
Next App Router запускает React transitions штатно; React без ViewTransition
сохраняет обычный вывод содержимого. Неподдерживающий браузер не анимирует переход.

```tsx
import type { ReactNode } from 'react';
import { PageTransition } from '@delba/ui';

export function Pages({ pathname, children }: { pathname: string; children: ReactNode }) {
  return (
    <PageTransition location={pathname} animate={{ when: 'change', effect: 'up', duration: 'fast', distance: 8 }}>
      {children}
    </PageTransition>
  );
}
```

`location` — pathname из адаптера роутера, без query/hash. Постоянные Header/Footer
размещаются снаружи. `animate.effect`: `fade` или `up`; duration — секунды либо
timing name, distance — MotionDistance. Умолчания у `motion.defaults.pageTransition`.
Изменение фильтра, варианта товара и локального состояния не анимирует всю страницу.
Reduced motion пропускает анимации; lifecycle и содержимое сохраняются. Новая
навигация отменяет незавершённые снимки силами React/браузера и cleanup анимаций.

Прокрутка имеет отдельного владельца: SmoothScroll получает pathname от того же
роутера. Новая страница начинается сверху, якорь получает штатный offset, а
Back/Forward сохраняют восстановление браузера/роутера. Граница PageTransition
не вызывает router.push и не подменяет history.

Проверять в настоящем App Router: переход из нижней части страницы, Back/Forward,
ссылку с hash, быстрый повторный переход, query-only обновление, reduced motion
и состояние persistent layout. Во время движения измерять промежуточную opacity,
а не только наличие компонента. Сборка и SSR проверяются отдельно.

Имена снимков регистрозависимы. WAAPI-селектор сохраняет регистр через CSS escape:
Chromium может привести неэкранированный идентификатор к нижнему регистру. Наличие
Animation с длительностью не подтверждает движение: проверяется промежуточная
computed opacity именно у существующего псевдоэлемента, включая имя React с `R`.
