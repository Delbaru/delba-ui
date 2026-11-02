import type { ReactNode } from 'react';
import type { SmoothScrollTarget, SmoothScrollToOptions } from './engine';
import type { SmoothScrollEasing, SmoothScrollOffset } from './smooth-scroll';

export type SmoothScrollProps = {
  /** Application content; the provider creates no DOM wrapper. */
  children: ReactNode;
  /** Инерция колеса: доля оставшегося пути за кадр 60 Гц, 0–1. Меньше — плавнее и дольше. По умолчанию motion.scroll.lerp (база 0.08). */
  lerp?: number;
  /** Множитель шага колеса и тачпада. По умолчанию `1`. */
  wheelMultiplier?: number;
  /** Длительность перелёта `scrollTo` и якорей, секунды. По умолчанию — от расстояния, 0.4–1.2 с. */
  duration?: number;
  /** Кривая из motionEasing/scrollEasing (@delba/ui/motion) либо функция. По умолчанию motion.scroll.easing (база easeOutExpo). */
  easing?: SmoothScrollEasing;
  /**
   * Отступ под фиксированную шапку для якорей и `scrollTo(элемент)`: px, CSS-длина или имя
   * переменной (`'--header-h'` — меряется на текущей ширине), функция. `scroll-margin-top` цели
   * его заменяет. По умолчанию `0`.
   */
  offset?: SmoothScrollOffset;
  /**
   * Плавность ниже десктопа и на сенсорных экранах. По умолчанию `false`: там колесо не
   * перехватывается, а перелёты ведёт браузер (`behavior: 'smooth'`).
   */
  mobile?: boolean;
  /** Перехватывать клики по ссылкам `#id` и `/путь#id` этой же страницы. По умолчанию `true`. */
  anchors?: boolean;
  /** Писать хеш якоря в адрес (`history.pushState`, без прыжка). По умолчанию `true`. */
  updateHash?: boolean;
};

/** API плавной прокрутки. Значение стабильно: чтение `scrollY` ре-рендер не вызывает. */
export type SmoothScrollApi = {
  /** Плавно к позиции (px), элементу, `'#id'` или селектору; к элементу — с учётом offset. */
  scrollTo: (target: SmoothScrollTarget, options?: SmoothScrollToOptions) => void;
  /** Оборвать текущий ход на месте. */
  stop: () => void;
  /** Текущая позиция окна — живой геттер, не реактивен. */
  readonly scrollY: number;
  /** Подписка на прокрутку окна (любую — колесом, клавишами, перелётом). Возвращает отписку. */
  subscribe: (listener: (scrollY: number) => void) => () => void;
};
