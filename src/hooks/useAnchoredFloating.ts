'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { clamp } from '../core/utils';

export type FloatingPlacement = 'top' | 'right' | 'bottom' | 'left';
export type FloatingAlign = 'start' | 'center' | 'end';
/** Viewport coordinates; anchorRef remains the real document and focus context. */
export type FloatingAnchorPoint = { x: number; y: number };
type FloatingRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>;

export function floatingAnchorRect(rect: FloatingRect, point?: FloatingAnchorPoint): FloatingRect {
  if (!point) return rect;
  return { top: point.y, bottom: point.y, left: point.x, right: point.x, width: 0, height: 0 };
}

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
  anchorPoint?: FloatingAnchorPoint;
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
  anchorRect: FloatingRect,
  floatingRect: FloatingRect,
  gap: number,
  viewportPadding: number,
  view: Window,
): FloatingPlacement {
  const viewportWidth = view.innerWidth;
  const viewportHeight = view.innerHeight;
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
  anchorRect: FloatingRect,
  floatingRect: FloatingRect,
  gap: number,
  viewportPadding: number,
  view: Window,
  clampTop = true,

): FloatingPosition {
  const viewportWidth = view.innerWidth;
  const viewportHeight = view.innerHeight;
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
  const view = floatingNode.ownerDocument.defaultView;
  if (!view || !(parent instanceof view.HTMLElement)) return { left: -(view?.scrollX ?? 0), top: -(view?.scrollY ?? 0) };
  const rect = parent.getBoundingClientRect();
  return {
    left: rect.left + parent.clientLeft - parent.scrollLeft,
    top: rect.top + parent.clientTop - parent.scrollTop,
  };
}

/** A transformed ancestor establishes the containing block even for fixed panels. */
function fixedContainingBlock(node: HTMLElement): HTMLElement | null {
  const view = node.ownerDocument.defaultView;
  if (!view) return null;
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const style = view.getComputedStyle(parent);
    const transformed = [style.transform, style.perspective, style.filter].some(value => value && value !== 'none');
    if (transformed || /(?:paint|layout|strict|content)/.test(style.contain) || /(?:transform|perspective|filter)/.test(style.willChange)) return parent;
  }
  return null;
}

/**
 * Сколько высоты у панели ЕСТЬ на выбранной стороне якоря. Уезжает на корень панели переменной
 * `--floating-available`, а распоряжается ей вёрстка панели (`SharedPopover`: max-height + свой
 * скролл). Без этого высокая панель у нижней кромки экрана не уменьшалась, а КЛАМПИЛАСЬ вверх и
 * накрывала собой якорь: на телефоне 393×660 список стран закрывал и пилюлю кода, и поле телефона.
 */
function resolveAvailableHeight(
  placement: FloatingPlacement,
  anchorRect: FloatingRect,
  gap: number,
  viewportPadding: number,
  view: Window,
): number {
  const viewportHeight = view.innerHeight;

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
  anchorPoint,
  floatingRef,
  isActive,
  placement: preferredPlacement = 'bottom',
  align = 'start',
  gap = 8,
  viewportPadding = 8,
  keepPositionWhenInactive = false,
  strategy = 'fixed',
}: UseAnchoredFloatingOptions) {
  const frameRef = useRef<{ view: Window; id: number } | null>(null);
  const connection = useRef<{
    anchor: Element;
    floating: HTMLElement;
    view: Window;
    schedule(): void;
    dispose(): void;
  } | null>(null);
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
    const anchorNode = anchorRef.current;
    const floatingNode = floatingRef.current;
    const view = anchorNode?.ownerDocument.defaultView;
    if (!isActive || !anchorNode || !floatingNode || !view) return;
    // A portal can move documents after its anchor; wait for both refs to agree.
    if (floatingNode.ownerDocument !== anchorNode.ownerDocument) return;

    const anchorRect = floatingAnchorRect(anchorNode.getBoundingClientRect(), anchorPoint);
    // Ширину якоря публикуем ДО замера панели: комбобокс тянет список ровно по ширине поля
    // (SharedPopover matchAnchorWidth). Отдай её после getBoundingClientRect — первый кадр
    // посчитается по контентной ширине панели, и кламп у края экрана уедет.
    floatingNode.style.setProperty('--floating-anchor-width', `${Math.round(anchorRect.width)}px`);
    const floatingRect = floatingNode.getBoundingClientRect();
    const nextStrategy: FloatingStrategy = strategy === 'document' && !anchorPoint && !hasPinnedAncestor(anchorNode) ? 'document' : 'fixed';
    strategyRef.current = nextStrategy;
    // В координатах документа сторона не переворачивается: до панели у низа экрана докручивают
    // страницу, а перевёрнутая вверх уходила под липкую шапку и была недоступна.
    const nextPlacement = anchorPoint || nextStrategy === 'document'
      ? preferredPlacement
      : resolvePlacement(preferredPlacement, anchorRect, floatingRect, gap, viewportPadding, view);
    const viewportPosition = resolveAlignedPosition(nextPlacement, align, anchorRect, floatingRect, gap, viewportPadding, view, nextStrategy === 'fixed');
    // Координаты документа — от offsetParent панели; position ставим до замера: от неё зависит offsetParent.
    floatingNode.style.position = nextStrategy === 'document' ? 'absolute' : 'fixed';
    const containingBlock = nextStrategy === 'fixed' ? fixedContainingBlock(floatingNode) : null;
    const blockRect = containingBlock?.getBoundingClientRect();
    if (blockRect) {
      viewportPosition.left = clamp(viewportPosition.left, blockRect.left + viewportPadding,
        Math.max(blockRect.left + viewportPadding, blockRect.right - floatingRect.width - viewportPadding));
      viewportPosition.top = clamp(viewportPosition.top, blockRect.top + viewportPadding,
        Math.max(blockRect.top + viewportPadding, blockRect.bottom - floatingRect.height - viewportPadding));
    }
    const origin = nextStrategy === 'document' ? documentOrigin(floatingNode)
      : blockRect && containingBlock ? {
        left: blockRect.left + containingBlock.clientLeft - containingBlock.scrollLeft,
        top: blockRect.top + containingBlock.clientTop - containingBlock.scrollTop,
      } : { left: 0, top: 0 };
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
      // В документе высота не ужимается до остатка экрана под якорем — только до высоты окна.
      `${Math.round(nextStrategy === 'document'
        ? Math.max(0, view.innerHeight - 2 * viewportPadding)
        : resolveAvailableHeight(nextPlacement, anchorRect, gap, viewportPadding, view))}px`

    );
    hasEverPositionedRef.current = true;

    setSnapshot((currentSnapshot) => (
      areSnapshotsEqual(currentSnapshot, nextSnapshot) ? currentSnapshot : nextSnapshot
    ));
  }, [align, anchorRef, anchorPoint?.x, anchorPoint?.y, floatingRef, gap, isActive, preferredPlacement, strategy, viewportPadding]);
  const updateRef = useRef(updatePosition);
  updateRef.current = updatePosition;


  const scheduleUpdatePosition = useCallback(() => {
    const view = anchorRef.current?.ownerDocument.defaultView;
    if (!view) return;
    if (frameRef.current !== null) return;

    frameRef.current = {
      view,
      id: view.requestAnimationFrame(() => {
        frameRef.current = null;
        updateRef.current();
      }),
    };
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();
  });

  useEffect(() => {
    if (!isActive) {
      setSnapshot((currentSnapshot) => (
        currentSnapshot.isPositioned ? { ...currentSnapshot, isPositioned: false } : currentSnapshot
      ));
    }
  }, [isActive]);

  // Refs can change targets after a commit without changing the ref object itself.
  useEffect(() => {
    const anchorNode = anchorRef.current;
    const floatingNode = floatingRef.current;
    const view = anchorNode?.ownerDocument.defaultView;
    const previous = connection.current;
    const unchanged = previous?.anchor === anchorNode && previous?.floating === floatingNode
      && previous?.view === view && previous?.schedule === scheduleUpdatePosition;
    if (isActive && unchanged) return;
    previous?.dispose();
    connection.current = null;
    if (!isActive || !anchorNode || !floatingNode || !view) return;

    const resizeObserver = view.ResizeObserver ? new view.ResizeObserver(scheduleUpdatePosition) : null;
    resizeObserver?.observe(anchorNode);
    resizeObserver?.observe(floatingNode);

    // Capture includes nested native scrollers, not just the page viewport. В координатах документа
    // прокрутку самой страницы браузер отрабатывает сам — пересчёт только у вложенных контейнеров.
    const handleScroll = (event: Event) => {
      if (strategyRef.current === 'document' && event.target === anchorNode.ownerDocument) return;
      scheduleUpdatePosition();
    };
    view.addEventListener('resize', scheduleUpdatePosition);
    view.addEventListener('scroll', handleScroll, true);


    const dispose = () => {
      if (frameRef.current !== null) {
        frameRef.current.view.cancelAnimationFrame(frameRef.current.id);
        frameRef.current = null;
      }

      resizeObserver?.disconnect();
      view.removeEventListener('resize', scheduleUpdatePosition);
      view.removeEventListener('scroll', handleScroll, true);

    };
    connection.current = { anchor: anchorNode, floating: floatingNode, view, schedule: scheduleUpdatePosition, dispose };
  });

  useEffect(() => () => {
    connection.current?.dispose();
    connection.current = null;
  }, []);

  // При деактивации обычно прячем за экран (анти-флэш до первого замера). С keepPositionWhenInactive
  // оставляем последнюю позицию — чтобы был виден fade-out (но до первого замера всё равно прячем).
  const shouldUseResolvedPosition = snapshot.isPositioned
    || (keepPositionWhenInactive && hasEverPositionedRef.current);
  const resolvedLeft = shouldUseResolvedPosition ? snapshot.left : HIDDEN_POSITION;
  const resolvedTop = shouldUseResolvedPosition ? snapshot.top : HIDDEN_POSITION;

  const style: FloatingStyle = {
    position: snapshot.strategy === 'document' ? 'absolute' : 'fixed',
    left: anchorPoint ? `${Math.round(resolvedLeft)}px` : 'var(--floating-left)',
    top: anchorPoint ? `${Math.round(resolvedTop)}px` : 'var(--floating-top)',
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
