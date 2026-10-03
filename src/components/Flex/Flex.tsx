'use client';

import Link from 'next/link';
import { useEffect, useImperativeHandle, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import type React from 'react';
import { boxLayout, containerClass, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type ContainerProp, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import type { Transition } from '../../core';
import type { RevealProps } from '../../core/reveal/reveal';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { useCollapseMotion, type CollapseHandle } from '../../hooks/useCollapseMotion';
import { useSwapTransition } from '../../hooks/useSwapTransition';
import { resolveResponsive } from '../../core/base/responsive';

type DirectionKey = 'row' | 'row_reverse' | 'column' | 'column_reverse';
type WrapKey = 'nowrap' | 'wrap' | 'wrap_reverse';
type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';
export type FlexEnterAnimation = 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInScale';
export type FlexAnimation = FlexEnterAnimation | 'fadeOut' | 'fadeOutUp' | 'fadeOutDown' | 'fadeOutScale';

const c = createLayoutClasses();

// Реестр анимаций (keyframes в _flex.scss): значение пропа → глобальный класс.
const animationClasses: Record<FlexAnimation, string | undefined> = {
  fadeIn: 'ui-anim-fadeIn',
  fadeInUp: 'ui-anim-fadeInUp',
  fadeInDown: 'ui-anim-fadeInDown',
  fadeInScale: 'ui-anim-fadeInScale',
  fadeOut: 'ui-anim-fadeOut',
  fadeOutUp: 'ui-anim-fadeOutUp',
  fadeOutDown: 'ui-anim-fadeOutDown',
  fadeOutScale: 'ui-anim-fadeOutScale',
};

// Exit — зеркало enter (для свопа через transitionKey): въезжает сверху → уходит вверх и т.д.
const exitAnimationOf: Partial<Record<FlexAnimation, FlexAnimation>> = {
  fadeIn: 'fadeOut',
  fadeInDown: 'fadeOutUp',
  fadeInUp: 'fadeOutDown',
  fadeInScale: 'fadeOutScale',
};

export interface FlexProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'dir' | 'href' | 'target' | 'rel' | 'download'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    BoxLayoutProps,
    ContainerProp,
    SharedMotionProps,
    RevealProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  state?: ComponentStateValue;
  /** Тег узла без `href`: `header`, `nav`, `footer`… */
  as?: 'div' | 'header' | 'nav' | 'footer' | 'main' | 'aside' | 'section' | 'ul' | 'li';

  gap?: ResponsiveValue<number>;
  rowGap?: ResponsiveValue<number>;
  columnGap?: ResponsiveValue<number>;

  /** Опт-ин сворачивание по высоте с presence: true — контент монтируется и плавно раскрывается,
   *  false — плавно сворачивается и УДАЛЯЕТСЯ из DOM по завершении анимации. Ход ведёт WAAPI
   *  (`animateCollapse`). Состояние держите снаружи (Redux/вью-модель) — размонтирование его не теряет. */
  collapse?: boolean;
  /** Верхний отступ сворачиваемого блока (дизайн-единицы, responsive — [d, m, t]).
   *  Анимируется вместе с высотой, поэтому заменяет родительский gap. Работает с collapse. */
  collapseGap?: ResponsiveValue<number>;
  /** Колбэк по завершении анимации сворачивания/раскрытия. Нужен потребителям, которым важен момент
   *  «анимация завершилась» (доизмерение SVG-коннекторов, скролл/фокус после раскрытия). Прерванный
   *  ход его НЕ зовёт. Аргумента больше нет (ход идёт не на CSS-переходе). Работает с collapse. */
  onCollapseEnd?: (event?: React.TransitionEvent<HTMLDivElement>) => void;
  /** Плавное затухание содержимого (opacity 0↔1) синхронно с высотой. Работает с collapse. */
  collapseFade?: boolean;
  /** После завершения раскрытия снять overflow:hidden с клипа (для выпадающих меню/дропдаунов
   *  внутри сворачиваемого блока). Во время анимации overflow остаётся скрытым. Работает с collapse. */
  collapseOverflowVisible?: boolean;
  /** Узел, ПОЯВИВШИЙСЯ от действия (новая строка списка), выезжает вместо появления кадром.
   *  Опт-ин: иначе первый кадр списка стал бы парадом раскрытий. Читается при монтировании. */
  collapseAppear?: boolean;
  /** Ось сворачивания: 'row' — по высоте (по умолчанию), 'column' — по ширине. collapseGap при этом
   *  анимирует padding-left вместо padding-top. Работает с collapse. */
  collapseAxis?: 'row' | 'column';
  /** Ручка сворачивания: `ref.current.transition` — ход, который вызвала последняя смена collapse.
   *  Нужна сценарию, которому важно дождаться хода (`await ref.current.transition`) или собрать его
   *  с чужими через `motion.together`. Узлом ручка НЕ командует: открыто/закрыто решает состояние. */
  collapseRef?: React.Ref<CollapseHandle>;
  /** Тот же ход, но колбэком — когда ручку некуда положить. Зовётся в момент старта. */
  onTransition?: (transition: Transition) => void;
  /** Закрытый блок ОСТАЁТСЯ в DOM (опт-ин): после сворачивания обёртка получает `hidden="until-found"` —
   *  текст видят поисковики и Ctrl+F, а браузер, найдя в нём совпадение, шлёт `beforematch`
   *  (см. onCollapseFound). Где `until-found` нет — обычный `hidden` + `inert`. Работает с collapse. */
  collapseKeepMounted?: boolean;
  /** Браузер нашёл текст в закрытом блоке (поиск по странице, переход по `#:~:text=`): владелец
   *  состояния ставит collapse={true}. Блок раскрывается сразу, без анимации, — иначе браузер
   *  прокрутил бы к ещё нулевой высоте. Работает с collapse и collapseKeepMounted. */
  onCollapseFound?: () => void;

  /** Enter-анимация. Без transitionKey — играет один раз при монтировании (появление контента).
   *  С transitionKey — служит enter'ом свопа (exit берётся зеркально). reduced-motion гасит. */
  animation?: FlexAnimation;
  /** Идентификатор контента для свопа в стиле AnimatePresence mode='wait' БЕЗ библиотеки: при его смене
   *  старый контент проигрывает exit (зеркало animation), затем подменяется новым с enter. Анимация идёт
   *  на самом узле Flex (без обёрток и ремоунта). Состояние держите снаружи — своп его не теряет. */
  transitionKey?: string | number;

  dir?: ResponsiveValue<DirectionKey>;
  justify?: ResponsiveValue<JustifyContentKey>;
  align?: ResponsiveValue<AlignItemsKey>;
  wrap?: ResponsiveValue<WrapKey>;

  /** Краевой fade скролл-контейнера: вешает глобальную утилиту .scrollFadeY (ось Y — при scrollFade или
   *  scrollFade='y') либо .scrollFadeX (scrollFade='x') — mask + scroll-driven animations, без JS
   *  (см. tokens.global.scss). Ставится на сам скроллящийся Flex; overflow задаёте как обычно. ВАЖНО:
   *  mask создаёт stacking context — плавающие оверлеи держите на элементе-обёртке, не на самом скролле. */
  scrollFade?: boolean | 'x' | 'y';

  linkState?: StateLinkInput;
  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;
}

export function Flex({
  ref,
  as = 'div',
  children,
  className = '',
  style,
  gap, rowGap, columnGap,
  collapse, collapseGap, onCollapseEnd, collapseFade, collapseOverflowVisible, collapseAxis, collapseAppear, collapseKeepMounted, onCollapseFound,
  collapseRef, onTransition,
  animation, transitionKey,
  dir, justify, align, wrap,
  scrollFade,
  perspective3d,
  parallax,
  reveal,
  container,
  state,
  onMouseEnter, onMouseLeave,
  href, target, rel, download, newTab, nofollow, noreferrer,
  linkState,
  ...props
}: WithRef<FlexProps, HTMLElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const isLink = Boolean(href);
  const Comp = (isLink ? (shouldUseNextLink(href, target, download) ? Link : 'a') : as) as React.ElementType;
  const resolved = resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer });
  const anchorProps = isLink ? { ...rest, ...resolved } : rest;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, reveal });
  // Своп контента по transitionKey (exit→enter на самом узле). Без transitionKey — passthrough.
  const { displayChildren, exiting, onAnimationEnd: onSwapAnimationEnd, ref: swapNodeRef } = useSwapTransition(transitionKey, children);
  const swapping = transitionKey !== undefined;
  const activeAnimation = swapping && exiting && animation ? (exitAnimationOf[animation] ?? animation) : animation;
  const setRefs = useMergedRefs(setMotionNode, swapNodeRef, ref);

  const content = (
    <Comp
      ref={setRefs}
      {...stateLinkProps(linkState, { onMouseEnter, onMouseLeave, ...motionHandlers })}
      className={cx(
        'ui-flex',
        containerClass(container),
        ...layout,
        ...c.value('gap', gap),
        ...c.value('rowGap', rowGap),
        ...c.value('columnGap', columnGap),
        ...c.value('dir', dir),
        ...c.value('justify', justify),
        ...c.value('align', align),
        ...c.value('wrap', wrap),
        scrollFade && (scrollFade === 'x' ? 'scrollFadeX' : 'scrollFadeY'),
        activeAnimation && animationClasses[activeAnimation],
        className
      )}
      style={{
        ...(motionStyle ?? null),
        ...style,
      }}
      {...revealAttrs}
      {...stateProps(state)}
      {...anchorProps}
      {...(swapping ? { onAnimationEnd: onSwapAnimationEnd } : null)}
    >
      {displayChildren}
    </Comp>
  );

  if (collapse === undefined) {
    return content;
  }

  // По высоте рамку держит сам Flex: он сжимается с треком и клипает своё содержимое. minH
  // сжаться не даст — тогда клипает внутренний слой, как раньше.
  return (
    <CollapseWrap
      open={collapse}
      clip={box.minH != null}
      axis={collapseAxis}
      collapseGap={collapseGap}
      fade={collapseFade}
      overflowVisibleWhenOpen={collapseOverflowVisible}
      appear={collapseAppear}
      keepMounted={collapseKeepMounted}
      onFound={onCollapseFound}
      onCollapseEnd={onCollapseEnd}
      onTransition={onTransition}
      handleRef={collapseRef}
    >
      {content}
    </CollapseWrap>
  );
}

interface CollapseWrapProps {
  open: boolean;
  axis?: 'row' | 'column';
  collapseGap?: ResponsiveValue<number>;
  fade?: boolean;
  overflowVisibleWhenOpen?: boolean;
  appear?: boolean;
  clip?: boolean;
  keepMounted?: boolean;
  onFound?: () => void;
  onCollapseEnd?: (event?: React.TransitionEvent<HTMLDivElement>) => void;
  onTransition?: (transition: Transition) => void;
  handleRef?: React.Ref<CollapseHandle>;
  children: React.ReactNode;
}

// `hidden="until-found"` React пишет как булев атрибут (`hidden=""`), поэтому значение ставит эффект.
// На сервере поддержку не узнать: первый HTML — с запасным `hidden` + `inert`, текст в нём всё равно есть.
const noSubscribe = () => () => {};
const supportsUntilFound = () => 'onbeforematch' in HTMLElement.prototype;

// Обёртка сворачивания: состояния покоя держит CSS (data-open), ход между ними ведёт WAAPI
// (useCollapseMotion → animateCollapse). Контент монтируется при раскрытии и УДАЛЯЕТСЯ из DOM по
// завершении сворачивания. settled — раскрытие доехало: только тогда снимаем клип
// (overflowVisibleWhenOpen). keepMounted: «размонтирован» значит «спрятан атрибутом hidden».
function CollapseWrap({ open, axis = 'row', collapseGap, fade, overflowVisibleWhenOpen, appear, clip, keepMounted, onFound, onCollapseEnd, onTransition, handleRef, children }: CollapseWrapProps) {
  const { mounted, visualOpen, settled, wrapRef, innerRef, handle } = useCollapseMotion<HTMLDivElement>({
    open,
    axis,
    appear,
    // По высоте в ноль идёт сам Flex (его рамка и радиус едут целиком); minH сжаться ему не даст,
    // и по ширине тоже — тогда размер ведёт внутренний слой, он же и клипает.
    sizeOnInner: clip === true || axis === 'column',
    fade,
    keepMounted,
    onEnd: onCollapseEnd,
    onTransition,
  });
  const untilFound = useSyncExternalStore(noSubscribe, supportsUntilFound, () => false);
  const onFoundRef = useRef(onFound);
  const concealed = keepMounted === true && !mounted;

  useImperativeHandle(handleRef, () => handle, [handle]);

  useEffect(() => {
    onFoundRef.current = onFound;
  });

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !keepMounted || !untilFound) return;
    if (concealed) node.setAttribute('hidden', 'until-found');
    else node.removeAttribute('hidden');
  }, [wrapRef, keepMounted, untilFound, concealed]);

  // Браузер уже снял hidden и сразу после события прокрутит к совпадению — к этому моменту блок
  // обязан стоять раскрытым. Состояние владельца дойдёт через рендер, поэтому раскрытие ставим
  // прямо в DOM без хода (data-instant); React потом пишет тот же data-open.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !keepMounted) return undefined;
    const onBeforeMatch = () => {
      node.setAttribute('data-instant', '');
      node.setAttribute('data-open', '');
      onFoundRef.current?.();
    };
    node.addEventListener('beforematch', onBeforeMatch);
    return () => node.removeEventListener('beforematch', onBeforeMatch);
  }, [wrapRef, keepMounted]);

  // Мгновенное раскрытие хода не вызывало — метку снимаем, когда состояние React догнало DOM.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !visualOpen || !node.hasAttribute('data-instant')) return;
    node.removeAttribute('data-instant');
  }, [wrapRef, visualOpen]);

  if (!mounted && !keepMounted) return null;

  // collapseGap → responsive CSS-переменные (--collapse-gap-d/-m/-t); null-брейкпоинты
  // наследуют desktop в SCSS. Зазор движок меряет у CSS — в JS значения не дублируются.
  const collapseStyle: Record<string, string> = {};
  if (collapseGap != null) {
    const [gapD, gapM, gapT] = resolveResponsive(collapseGap);
    if (gapD != null) collapseStyle['--collapse-gap-d'] = `calc(${gapD} * var(--rpx))`;
    if (gapM != null) collapseStyle['--collapse-gap-m'] = `calc(${gapM} * var(--rpx))`;
    if (gapT != null) collapseStyle['--collapse-gap-t'] = `calc(${gapT} * var(--rpx))`;
  }

  // inert прячет от Tab и чтения, но и от поиска по странице — спрятанному until-found он не нужен.
  const searchable = concealed && untilFound;

  return (
    <div
      ref={wrapRef}
      className={cx('ui-collapse', fade && 'ui-collapse-fade')}
      data-axis={axis}
      data-open={visualOpen || undefined}
      data-settled={settled || undefined}
      hidden={(concealed && !untilFound) || undefined}
      inert={!visualOpen && !searchable}
      style={collapseStyle as CSSProperties}
    >
      <div
        ref={innerRef}
        className={cx('ui-collapse-inner', clip && 'ui-collapse-clip', overflowVisibleWhenOpen && settled && 'ui-collapse-visible')}
      >
        {children}
      </div>
    </div>
  );
}
