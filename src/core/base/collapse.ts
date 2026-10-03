import { Transition, createTransition, readMotionTiming } from './transition';

export type CollapseAxis = 'row' | 'column';

/** Геометрия сворачиваемого блока в один момент: то, что ведёт движок, и больше ничего. */
export interface CollapseFrame {
  /** Высота (ось `row`) или ширина (ось `column`) сворачиваемого слоя, px. */
  size: number;
  /** Отступ и рамка слоя по оси: блок не бывает тоньше их суммы, поэтому они едут вместе с размером. */
  padStart: number;
  padEnd: number;
  borderStart: number;
  borderEnd: number;
  /** Зазор на обёртке (`collapseGap`), px. */
  gap: number;
  /** Прозрачность содержимого (`collapseFade`). */
  opacity: number;
}

export interface CollapseNodes {
  /** Обёртка `.ui-collapse`: на ней зазор, состояние `data-open` и токены длительности. */
  wrap: HTMLElement;
  /** Слой `.ui-collapse-inner`: он клипает и он же ведёт размер, когда сам блок сжаться не может. */
  inner: HTMLElement;
  /** Сворачиваемый блок (сам `Flex`). */
  content: HTMLElement | null;
}

export interface CollapseRunOptions {
  axis: CollapseAxis;
  /** Куда едем. Состояние покоя к этому моменту уже стоит в DOM — движок его и меряет. */
  open: boolean;
  /** Размер ведёт внутренний слой: блоку мешает `minH`, либо ось — ширина. */
  sizeOnInner: boolean;
  fade: boolean;
}

// Своя подпись у анимаций движка: по ней находим недоехавший ход, чтобы продолжить от его места,
// а не от состояния покоя. Чужие анимации на тех же узлах (реveal, свопы) мы не трогаем.
const COLLAPSE_ANIMATION_ID = 'ui-collapse';

const px = (value: number): string => `${value}px`;
const num = (value: string): number => {
  const parsed = parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Кадр для самого слоя: размер по оси плюс отступы и рамки, без которых ноль недостижим. */
export function sizeFrameStyle(frame: CollapseFrame, axis: CollapseAxis): Keyframe {
  return axis === 'column'
    ? {
        width: px(frame.size),
        paddingLeft: px(frame.padStart),
        paddingRight: px(frame.padEnd),
        borderLeftWidth: px(frame.borderStart),
        borderRightWidth: px(frame.borderEnd),
      }
    : {
        height: px(frame.size),
        paddingTop: px(frame.padStart),
        paddingBottom: px(frame.padEnd),
        borderTopWidth: px(frame.borderStart),
        borderBottomWidth: px(frame.borderEnd),
      };
}

/** Кадр зазора на обёртке: он закрывается синхронно с размером, иначе соседи дёргаются отдельно. */
export function gapFrameStyle(frame: CollapseFrame, axis: CollapseAxis): Keyframe {
  return axis === 'column' ? { paddingLeft: px(frame.gap) } : { paddingTop: px(frame.gap) };
}

/** Нечему ехать: обе стороны хода совпали (повторный клик, нулевой блок, уже открыто). */
export function framesEqual(from: CollapseFrame, to: CollapseFrame): boolean {
  return (Object.keys(from) as Array<keyof CollapseFrame>).every((key) => from[key] === to[key]);
}

function measureFrame(nodes: CollapseNodes, target: HTMLElement, axis: CollapseAxis): CollapseFrame {
  const style = getComputedStyle(target);
  const wrapStyle = getComputedStyle(nodes.wrap);
  const rect = target.getBoundingClientRect();
  const row = axis === 'row';

  return {
    size: row ? rect.height : rect.width,
    padStart: num(row ? style.paddingTop : style.paddingLeft),
    padEnd: num(row ? style.paddingBottom : style.paddingRight),
    borderStart: num(row ? style.borderTopWidth : style.borderLeftWidth),
    borderEnd: num(row ? style.borderBottomWidth : style.borderRightWidth),
    gap: num(row ? wrapStyle.paddingTop : wrapStyle.paddingLeft),
    opacity: num(getComputedStyle(nodes.inner).opacity),
  };
}

function collapseAnimations(nodes: CollapseNodes): Animation[] {
  const nodeList = [nodes.wrap, nodes.inner, nodes.content];

  return nodeList.flatMap((node) => (node ? node.getAnimations() : [])).filter((animation) => animation.id === COLLAPSE_ANIMATION_ID);
}

/**
 * Свернуть или раскрыть блок на Web Animations API. Состояние покоя (открыт / закрыт) держит CSS и
 * ставит React — движок только меряет обе стороны и ведёт между ними пиксели: высоту «auto» анимацией
 * не взять, поэтому старт и финиш замеряются, а по концу хода инлайна не остаётся вовсе.
 *
 * Прерывание идёт от ТЕКУЩЕЙ геометрии: недоехавший ход находится по подписи анимации и меряется
 * живым, до отмены, — поэтому второй клик не бросает блок к краю и высота остаётся монотонной.
 *
 * Возвращает `Transition`; «ничего не поехало» — это `Transition.done()`, а не `null`.
 */
export function animateCollapse(nodes: CollapseNodes, options: CollapseRunOptions): Transition {
  const { wrap, inner, content } = nodes;
  const { axis, open, sizeOnInner, fade } = options;
  const target = sizeOnInner || !content ? inner : content;

  // Радиус обрезки — у содержимого: клипает внутренний слой (clip-path в _flex.scss), а скругление
  // нарисовано на блоке. Без него углы карточки становятся прямыми ровно на середине сворачивания.
  if (content) wrap.style.setProperty('--collapse-radius', getComputedStyle(content).borderRadius);

  const previous = collapseAnimations(nodes);
  const live = previous.some((animation) => animation.playState === 'running') ? measureFrame(nodes, target, axis) : null;

  previous.forEach((animation) => animation.cancel());

  const to = measureFrame(nodes, target, axis);

  // Прошлое состояние покоя меряется им же: на один синхронный замер возвращаем атрибут назад.
  // Так движок берёт у CSS и респонсивный зазор, и любые размеры проекта, ничего не повторяя в JS.
  wrap.toggleAttribute('data-open', !open);
  const resting = measureFrame(nodes, target, axis);
  wrap.toggleAttribute('data-open', open);

  const from = live ?? resting;

  if (framesEqual(from, to)) return Transition.done();

  const timing = readMotionTiming(wrap, {
    duration: ['--collapse-duration', '--t-d-fast'],
    delay: ['--collapse-delay'],
    easing: ['--t-t-f-ease'],
  });
  const keyframeOptions: KeyframeAnimationOptions = {
    duration: timing.duration,
    delay: timing.delay,
    easing: timing.easing,
    // backwards: во время задержки узел стоит на СТАРТОВОМ кадре, иначе он прыгал бы к финишу и ждал.
    fill: 'backwards',
    id: COLLAPSE_ANIMATION_ID,
  };

  const animations = [target.animate([sizeFrameStyle(from, axis), sizeFrameStyle(to, axis)], keyframeOptions)];

  if (from.gap !== to.gap) animations.push(wrap.animate([gapFrameStyle(from, axis), gapFrameStyle(to, axis)], keyframeOptions));
  if (fade && from.opacity !== to.opacity) {
    animations.push(inner.animate([{ opacity: from.opacity }, { opacity: to.opacity }], keyframeOptions));
  }

  return createTransition(animations);
}
