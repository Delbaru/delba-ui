'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';

import { useAnchoredFloating, type FloatingAlign, type FloatingPlacement } from './useAnchoredFloating';

export interface UseTooltipOptions {
  /** Пока false — тултип не показывается (позиционирование простаивает). Удобно гейтить, напр. «только при обрезке текста». */
  enabled?: boolean;
  /** Сторона относительно якоря. По умолчанию снизу. */
  direction?: FloatingPlacement;
  /** Выравнивание вдоль стороны. По умолчанию по центру. */
  align?: FloatingAlign;
  /** Отступ между якорем и тултипом, px. */
  gap?: number;
  /** Минимальный отступ от краёв вьюпорта, px. */
  viewportPadding?: number;
  /** Создавать портал только после первого показа; для небольших тултипов вроде Icon. */
  lazyPortal?: boolean;
  /** Оставлять последнюю позицию на время fade-out. */
  keepPositionWhenInactive?: boolean;
}

/** Пропы для presentational-компонента `<Tooltip>` — разворачиваются спредом. */
export interface TooltipBubbleProps {
  portalNode: HTMLElement | null;
  style: CSSProperties;
  placement: FloatingPlacement;
  active: boolean;
}

export interface UseTooltipResult<A extends Element = HTMLElement, F extends HTMLElement = HTMLElement> {
  /** Ref на якорь (элемент, относительно которого позиционируется тултип). Writable — можно мёржить с другими ref'ами. */
  anchorRef: MutableRefObject<A | null>;
  /** Ref на саму всплывашку (нужен для измерения её размера). */
  tooltipRef: MutableRefObject<F | null>;
  /** Активен ли тултип прямо сейчас (с учётом enabled). */
  isActive: boolean;
  show: () => void;
  hide: () => void;
  /** Хэндлеры наведения/фокуса для спреда на триггер. */
  anchorHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  bubbleProps: TooltipBubbleProps;
}

/**
 * Поведение тултипа: видимость по наведению/фокусу + позиционирование через `useAnchoredFloating`
 * + портал в `document.body`. Вынесено из Button/Icon, чтобы не дублировать логику в каждом компоненте.
 * Рендер всплывашки — в общем компоненте `<Tooltip>` (см. UI/Tooltip).
 */
export function useTooltip<A extends Element = HTMLElement, F extends HTMLElement = HTMLElement>({
  enabled = true,
  direction = 'bottom',
  align = 'center',
  gap = 8,
  viewportPadding = 8,
  lazyPortal = false,
  keepPositionWhenInactive = true,
}: UseTooltipOptions = {}): UseTooltipResult<A, F> {
  const anchorRef = useRef<A | null>(null);
  const tooltipRef = useRef<F | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const isActive = enabled && (isHovered || isFocused);

  const { placement, isPositioned, style } = useAnchoredFloating({
    anchorRef,
    floatingRef: tooltipRef,
    isActive,
    placement: direction,
    align,
    gap,
    viewportPadding,
    // Тултипы должны плавно исчезать — оставляем позицию на время fade-out.
    keepPositionWhenInactive,
  });

  useEffect(() => {
    if (lazyPortal && !hasShown) return;
    setPortalNode(document.body);
  }, [hasShown, lazyPortal]);

  const show = useCallback(() => {
    if (!enabled) return;
    setIsHovered(true);
    if (lazyPortal) setHasShown(true);
  }, [enabled, lazyPortal]);
  const hide = useCallback(() => setIsHovered(false), []);
  const focus = useCallback(() => {
    if (!enabled) return;
    setIsFocused(true);
    if (lazyPortal) setHasShown(true);
  }, [enabled, lazyPortal]);
  const blur = useCallback(() => setIsFocused(false), []);

  const anchorHandlers = {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: focus,
    onBlur: blur,
  };

  return {
    anchorRef,
    tooltipRef,
    isActive,
    show,
    hide,
    anchorHandlers,
    bubbleProps: {
      portalNode,
      style,
      placement,
      active: isActive && isPositioned,
    },
  };
}
