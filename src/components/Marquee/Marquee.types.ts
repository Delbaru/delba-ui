import type { ComponentProps, ReactNode } from 'react';
import type { Flex } from '../Flex';
import type { ResponsiveValue } from '../../core';

export type MarqueeProps = Omit<
  ComponentProps<typeof Flex>,
  'ref' | 'as' | 'dir' | 'gap' | 'children'
> & {
  children: ReactNode;
  /** Тег каждой копии ленты. `ul` — когда элементы `li`: список читается один раз, копии скрыты. */
  as?: 'div' | 'ul';
  /** Зазор между элементами и между копиями, кортеж `[desktop, mobile, tablet]`. */
  gap?: ResponsiveValue<number>;
  /** Скорость, px в секунду. Лента длиннее — едет столько же пикселей в секунду, а не дольше круг. */
  speed?: number;
  /** Ехать вправо, а не влево. */
  reverse?: boolean;
  /**
   * Остановить движение — это кнопка паузы проекта (WCAG 2.2.2: движение дольше пяти секунд
   * обязано останавливаться). Останавливается плавно, тащить мышью можно и на паузе.
   */
  paused?: boolean;
  /** Тащить ленту мышью и пальцем, с инерцией после броска. */
  draggable?: boolean;
  /** Затухание по краям окна. */
  fade?: boolean;
};
