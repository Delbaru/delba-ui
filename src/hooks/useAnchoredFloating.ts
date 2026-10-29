'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { clamp } from '../core/utils';

export type FloatingPlacement = 'top' | 'right' | 'bottom' | 'left';
export type FloatingAlign = 'start' | 'center' | 'end';

type FloatingStyle = CSSProperties & {
  '--floating-left'?: string;
  '--floating-top'?: string;
};

/**
 * - `fixed` — координаты окна (`position: fixed`), пересчёт на каждой прокрутке; панель не выходит за
 *   края экрана. Тултип и календарь: короткоживущие, рядом с курсором.
 * - `document` — координаты документа (`position: absolute` от offsetParent): прокрутку страницы
 *   браузер двигает вместе с якорем сам, без кадра отставания, а по вертикали панель не зажата
 *   экраном — уходит за край вместе с якорем, а не прилипает к нему. Пересчёт — при изменении
 *   размеров и прокрутке вложенных контейнеров. Якорь в fixed/sticky-предке (шапка, окно) — как `fixed`:
 *   иначе панель уехала бы от прилипшего якоря.
 */
export type FloatingStrategy = 'fixed' | 'document';

type UseAnchoredFloatingOptions = {
  anchorRef: RefObject<Element | null>;
  floatingRef: RefObject<HTMLElement | null>;
  isActive: boolean;
  placement?: FloatingPlacement;
  align?: FloatingAlign;
  gap?: number;
  viewportPadding?: number;
  /**
   * Не уводить элемент за экран (на HIDDEN_POSITION) при деактивации, а оставлять на последней
   * вычисленной позиции. Нужно для плавного fade-out: иначе элемент мгновенно «телепортируется»
   * за экран и анимация исчезновения не видна. До первого позиционирования всё равно прячем.
   */
  keepPositionWhenInactive?: boolean;
  /** Система координат панели (см. `FloatingStrategy`). По умолчанию `fixed`. */
  strategy?: FloatingStrategy;
};

type FloatingSnapshot = {
  placement: FloatingPlacement;
  left: number;
  top: number;
  isPositioned: boolean;
  /** Фактическая система координат: `document` откатывается в `fixed` у закреплённого якоря. */
  strategy: FloatingStrategy;
};

type FloatingPosition = Omit<FloatingSnapshot, 'isPositioned' | 'strategy'>;

const HIDDEN_POSITION = -9999;

function resolvePlacement(
  preferredPlacement: FloatingPlacement,
  anchorRect: DOMRect,
  floatingRect: DOMRect,
  gap: number,
  viewportPadding: number
): FloatingPlacement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceTop = anchorRect.top - viewportPadding;
  const spaceRight = viewportWidth - anchorRect.right - viewportPadding;
  const spaceBottom = viewportHeight - anchorRect.bottom - viewportPadding;
  const spaceLeft = anchorRect.left - viewportPadding;

  if (preferredPlacement === 'bottom') {
    return spaceBottom < floatingRect.height + gap && spaceTop > spaceBottom ? 'top' : 'bottom';
  }

  if (preferredPlacement === 'top') {
    return spaceTop < floatingRect.height + gap && spaceBottom > spaceTop ? 'bottom' : 'top';
  }

  if (preferredPlacement === 'right') {
    return spaceRight < floatingRect.width + gap && spaceLeft > spaceRight ? 'left' : 'right';
  }

  return spaceLeft < floatingRect.width + gap && spaceRight > spaceLeft ? 'right' : 'left';
}

function resolveAlignedPosition(
  placement: FloatingPlacement,
  align: FloatingAlign,
  anchorRect: DOMRect,
  floatingRect: DOMRect,
  gap: number,
  viewportPadding: number,
  /** По вертикали держать в окне. В координатах документа — нет: панель уходит вместе с якорем. */
  clampTop = true
): FloatingPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(viewportPadding, viewportWidth - floatingRect.width - viewportPadding);
  const maxTop = Math.max(viewportPadding, viewportHeight - floatingRect.height - viewportPadding);

  let left = anchorRect.left;
  let top = anchorRect.bottom + gap;

  if (placement === 'top' || placement === 'bottom') {
    if (align === 'center') {
      left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
    } else if (align === 'end') {
      left = anchorRect.right - floatingRect.width;
    }

    top = placement === 'top'
      ? anchorRect.top - floatingRect.height - gap
      : anchorRect.bottom + gap;
  } else {
    if (align === 'center') {
      top = anchorRect.top + anchorRect.height / 2 - floatingRect.height / 2;
    } else if (align === 'end') {
      top = anchorRect.bottom - floatingRect.height;
    } else {
      top = anchorRect.top;
    }

    left = placement === 'left'
      ? anchorRect.left - floatingRect.width - gap
      : anchorRect.right + gap;
  }

  return {
    placement,
    left: clamp(left, viewportPadding, maxLeft),
    top: clampTop ? clamp(top, viewportPadding, maxTop) : top,
  };
}

/** Якорь живёт в fixed/sticky-предке: координаты документа его не догонят при прокрутке страницы. */
function hasPinnedAncestor(node: Element): boolean {
  const view = node.ownerDocument.defaultView;
  if (!view) return false;
  for (let current: Element | null = node; current && current !== node.ownerDocument.documentElement; current = current.parentElement) {
    const position = view.getComputedStyle(current).position;
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

/** Смещение от окна к системе offsetParent панели: её `left/top` при `position: absolute`. */
function documentOrigin(floatingNode: HTMLElement): { left: number; top: number } {
  const parent = floatingNode.offsetParent;
  if (!(parent instanceof HTMLElement)) return { left: -window.scrollX, top: -window.scrollY };
  const rect = parent.getBoundingClientRect();
  return {
    left: rect.left + parent.clientLeft - parent.scrollLeft,
    top: rect.top + parent.clientTop - parent.scrollTop,
  };
}

/**
 * Сколько высоты у панели ЕСТЬ на выбранной стороне якоря. Уезжает на корень панели переменной
 * `--floating-available`, а распоряжается ей вёрстка панели (`SharedPopover`: max-height + свой
 * скролл). Без этого высокая панель у нижней кромки экрана не уменьшалась, а КЛАМПИЛАСЬ вверх и
 * накрывала собой якорь: на телефоне 393×660 список стран закрывал и пилюлю кода, и поле телефона.
 */
function resolveAvailableHeight(
  placement: FloatingPlacement,
  anchorRect: DOMRect,
  gap: number,
  viewportPadding: number
): number {
  const viewportHeight = window.innerHeight;

  if (placement === 'top') {
    return Math.max(0, anchorRect.top - gap - viewportPadding);
  }

  if (placement === 'bottom') {
    return Math.max(0, viewportHeight - anchorRect.bottom - gap - viewportPadding);
  }

  // Сбоку от якоря высота панели ограничена только экраном: она стоит вровень с якорем, а не под ним.
  return Math.max(0, viewportHeight - 2 * viewportPadding);
}

function areSnapshotsEqual(left: FloatingSnapshot, right: FloatingSnapshot) {
  return left.placement === right.placement
    && left.isPositioned === right.isPositioned
    && Math.round(left.left) === Math.round(right.left)
    && Math.round(left.top) === Math.round(right.top)
    && left.strategy === right.strategy;
}

export function useAnchoredFloating({
  anchorRef,
  floatingRef,
  isActive,
  placement: preferredPlacement = 'bottom',
  align = 'start',
  gap = 8,
  viewportPadding = 8,
  keepPositionWhenInactive = false,
  strategy = 'fixed',
}: UseAnchoredFloatingOptions) {
  const frameRef = useRef<number | null>(null);
  const hasEverPositionedRef = useRef(false);
  // Фактическая система координат последнего замера — для фильтра прокрутки без ре-рендера.
  const strategyRef = useRef<FloatingStrategy>(strategy);
  const [snapshot, setSnapshot] = useState<FloatingSnapshot>({
    placement: preferredPlacement,
    left: HIDDEN_POSITION,
    top: HIDDEN_POSITION,
    isPositioned: false,
    strategy,
  });

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined' || !isActive) return;

    const anchorNode = anchorRef.current;
    const floatingNode = floatingRef.current;
    if (!anchorNode || !floatingNode) return;

    const anchorRect = anchorNode.getBoundingClientRect();
    // Ширину якоря публикуем ДО замера панели: комбобокс тянет список ровно по ширине поля
    // (SharedPopover matchAnchorWidth). Отдай её после getBoundingClientRect — первый кадр
    // посчитается по контентной ширине панели, и кламп у края экрана уедет.
    floatingNode.style.setProperty('--floating-anchor-width', `${Math.round(anchorRect.width)}px`);
    const floatingRect = floatingNode.getBoundingClientRect();
    const nextStrategy: FloatingStrategy = strategy === 'document' && !hasPinnedAncestor(anchorNode) ? 'document' : 'fixed';
    strategyRef.current = nextStrategy;
    const nextPlacement = resolvePlacement(preferredPlacement, anchorRect, floatingRect, gap, viewportPadding);
    const viewportPosition = resolveAlignedPosition(nextPlacement, align, anchorRect, floatingRect, gap, viewportPadding, nextStrategy === 'fixed');
    // Координаты документа — от offsetParent панели; position ставим до замера: от неё зависит offsetParent.
    floatingNode.style.position = nextStrategy === 'document' ? 'absolute' : 'fixed';
    const origin = nextStrategy === 'document' ? documentOrigin(floatingNode) : { left: 0, top: 0 };
    const nextSnapshot = {
      ...viewportPosition,
      left: viewportPosition.left - origin.left,
      top: viewportPosition.top - origin.top,
      isPositioned: true,
      strategy: nextStrategy,
    };

    floatingNode.style.setProperty('--floating-left', `${Math.round(nextSnapshot.left)}px`);
    floatingNode.style.setProperty('--floating-top', `${Math.round(nextSnapshot.top)}px`);
    floatingNode.style.setProperty(
      '--floating-available',
      `${Math.round(resolveAvailableHeight(nextPlacement, anchorRect, gap, viewportPadding))}px`
    );
    hasEverPositionedRef.current = true;

    setSnapshot((currentSnapshot) => (
      areSnapshotsEqual(currentSnapshot, nextSnapshot) ? currentSnapshot : nextSnapshot
    ));
  }, [align, anchorRef, floatingRef, gap, isActive, preferredPlacement, strategy, viewportPadding]);

  const scheduleUpdatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!isActive) {
      setSnapshot((currentSnapshot) => (
        currentSnapshot.isPositioned ? { ...currentSnapshot, isPositioned: false } : currentSnapshot
      ));
      return;
    }

    if (typeof window === 'undefined') return;

    updatePosition();
    const anchorNode = anchorRef.current;
    const floatingNode = floatingRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdatePosition)
      : null;

    resizeObserver?.observe(anchorNode ?? document.body);
    if (floatingNode) resizeObserver?.observe(floatingNode);

    // Capture includes nested native scrollers, not just the page viewport. В координатах документа
    // прокрутку самой страницы браузер отрабатывает сам — пересчёт только у вложенных контейнеров.
    const handleScroll = (event: Event) => {
      if (strategyRef.current === 'document' && event.target === document) return;
      scheduleUpdatePosition();
    };
    window.addEventListener('resize', scheduleUpdatePosition);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [anchorRef, floatingRef, isActive, scheduleUpdatePosition, updatePosition]);

  // При деактивации обычно прячем за экран (анти-флэш до первого замера). С keepPositionWhenInactive
  // оставляем последнюю позицию — чтобы был виден fade-out (но до первого замера всё равно прячем).
  const shouldUseResolvedPosition = snapshot.isPositioned
    || (keepPositionWhenInactive && hasEverPositionedRef.current);
  const resolvedLeft = shouldUseResolvedPosition ? snapshot.left : HIDDEN_POSITION;
  const resolvedTop = shouldUseResolvedPosition ? snapshot.top : HIDDEN_POSITION;

  const style: FloatingStyle = {
    position: snapshot.strategy === 'document' ? 'absolute' : 'fixed',
    left: 'var(--floating-left)',
    top: 'var(--floating-top)',
    '--floating-left': `${Math.round(resolvedLeft)}px`,
    '--floating-top': `${Math.round(resolvedTop)}px`,
  };

  return {
    placement: snapshot.placement,
    isPositioned: snapshot.isPositioned,
    /** Фактическая система координат: `document` у закреплённого якоря становится `fixed`. */
    strategy: snapshot.strategy,
    style,
    updatePosition,
  };
}
