'use client';

import Link from 'next/link';
import { type CSSProperties } from 'react';
import type React from 'react';
import { boxLayout, composeEventHandlers, containerClass, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type ContainerProp, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import type { Transition } from '../../core';
import { isAppearanceAnimate, type AppearanceAnimate, type RevealProps } from '../../core/reveal/reveal';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseHandle } from '../../hooks/useCollapseMotion';
import { resolveContentAnimate, type ContentAnimate, type ContentAnimation, type ContentEnter } from '../../hooks/contentMotion';
import { useContentMotion } from '../../hooks/useContentMotion';
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';

type DirectionKey = 'row' | 'row_reverse' | 'column' | 'column_reverse';
type WrapKey = 'nowrap' | 'wrap' | 'wrap_reverse';
type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';
/** Вход Flex — общий словарь движения содержимого. */
export type FlexEnterAnimation = ContentEnter;
/** Прежний проп `animation` принимал и уходы — они играют один раз при монтировании. */
export type FlexAnimation = ContentAnimation;

const c = createLayoutClasses();

interface FlexCollapseOptions extends CollapseOptions {
  /** Оставить закрытый контент в DOM для поиска по странице. */
  keepMounted?: boolean;
  /** Раскрыть найденный браузером контент. Используется вместе с `keepMounted`. */
  onFound?: () => void;
  /** Вызывается после завершённого раскрытия или закрытия. */
  onEnd?: () => void;
  /** Передать начавшийся переход вызывающему коду. */
  onTransition?: (transition: Transition) => void;
  /** Доступ к последнему переходу для ожидания и композиции. */
  ref?: React.Ref<CollapseHandle>;
  /** Снять обрезку после раскрытия для вложенных выпадающих элементов. */
  overflowVisibleWhenOpen?: boolean;
  /** Анимировать появление при первом монтировании. */
  appear?: boolean;
}

export interface FlexProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'dir' | 'href' | 'target' | 'rel' | 'download'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    BoxLayoutProps,
    ContainerProp,
    SharedMotionProps<ContentAnimate>,
    RevealProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  state?: ComponentStateValue;
  /** Тег узла без `href`: `header`, `nav`, `footer`… */
  as?: 'div' | 'header' | 'nav' | 'footer' | 'main' | 'aside' | 'section' | 'ul' | 'li' | 'dl';

  gap?: ResponsiveValue<number>;
  rowGap?: ResponsiveValue<number>;
  columnGap?: ResponsiveValue<number>;

  /** Сворачивание всего Flex: `collapse={{ open, gap, fade }}`. Прежний boolean сохранён для
   *  совместимости. Состояние держится снаружи; закрытый контент удаляется после анимации. */
  collapse?: boolean | FlexCollapseOptions;
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

  /** Появление и смена содержимого: `animate="fadeIn"` — вход при монтировании,
   *  `animate={['fadeIn', { key: tab }]}` — при смене `key` старое уходит зеркальным ходом, затем входит
   *  новое. Узел тот же (ref и фокус сохраняются), reduced-motion меняет сразу. Если задан, прежние
   *  `animation` и `transitionKey` не читаются. */
  animate?: AppearanceAnimate | ContentAnimate;
  /** Прежняя запись входа; новая — `animate`. Без transitionKey — играет один раз при монтировании (появление контента).
   *  С transitionKey — служит enter'ом свопа (exit берётся зеркально). reduced-motion гасит. */
  animation?: FlexAnimation;
  /** Прежняя запись ключа свопа; новая — `animate={[вход, { key }]}`. Идентификатор контента для свопа в стиле AnimatePresence mode='wait' БЕЗ библиотеки: при его смене
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
  animate, animation, transitionKey,
  dir, justify, align, wrap,
  scrollFade,
  perspective3d,
  parallax,
  reveal,
  container,
  state,
  onMouseEnter, onMouseMove, onMouseLeave, onMouseDown, onMouseUp,
  onClick, onFocus, onBlur,
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
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, reveal, animate });
  const contentAnimate = isAppearanceAnimate(animate) ? undefined : animate;
  const motionInput = contentAnimate !== undefined ? resolveContentAnimate(contentAnimate) : { animation, key: transitionKey };
  const contentMotion = useContentMotion({ ...motionInput, children, onAnimationEnd: anchorProps.onAnimationEnd });
  const setRefs = useMergedRefs(setMotionNode, contentMotion.ref, ref);

  const content = (
    <Comp
      ref={setRefs}
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
        contentMotion.className,
        className
      )}
      style={{
        ...(motionStyle ?? null),
        ...style,
      }}
      {...revealAttrs}
      {...stateProps(state)}
      {...anchorProps}
      {...stateLinkProps(linkState, {
        onMouseEnter: composeEventHandlers(motionHandlers?.onMouseEnter, onMouseEnter),
        onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
        onMouseLeave: composeEventHandlers(motionHandlers?.onMouseLeave, onMouseLeave),
        onMouseDown,
        onMouseUp,
        onClick,
        onFocus,
        onBlur,
      })}
      onAnimationEnd={contentMotion.onAnimationEnd}
    >
      {contentMotion.children}
    </Comp>
  );

  if (collapse === undefined) {
    return content;
  }

  const collapseOptions: FlexCollapseOptions = typeof collapse === 'boolean' ? { open: collapse } : collapse;

  // По высоте рамку держит сам Flex: он сжимается с треком и клипает своё содержимое. minH
  // сжаться не даст — тогда клипает внутренний слой, как раньше.
  return (
    <CollapseWrap
      open={collapseOptions.open}
      clip={box.minH != null}
      axis={collapseOptions.axis ?? collapseAxis}
      gap={collapseOptions.gap ?? collapseGap}
      gapSide={collapseOptions.gapSide}
      fade={collapseOptions.fade ?? collapseFade}
      overflowVisibleWhenOpen={collapseOptions.overflowVisibleWhenOpen ?? collapseOverflowVisible}
      appear={collapseOptions.appear ?? collapseAppear}
      keepMounted={collapseOptions.keepMounted ?? collapseKeepMounted}
      onFound={collapseOptions.onFound ?? onCollapseFound}
      onEnd={collapseOptions.onEnd ?? onCollapseEnd}
      onTransition={collapseOptions.onTransition ?? onTransition}
      handleRef={collapseOptions.ref ?? collapseRef}
    >
      {content}
    </CollapseWrap>
  );
}
