'use client';

import { Component, cloneElement, type ReactNode, type RefObject } from 'react';
import { MEDIA_QUERY, MOTION_END_BUFFER_MS, prefersReducedMotion } from '../../core';
import { readMotionTimeMs } from '../../core/base/timing';
import { motionDistanceCss } from '../../core/base/distance';
import { motionDefaults, readMotionDefaultMs } from '../../core/base/motion-config';
import { layoutEntries, retainLayoutExits, type GridLayoutAnimate, type LayoutEntry } from './layout';

type Props = { children: ReactNode; host: RefObject<HTMLDivElement | null>; options: GridLayoutAnimate; layoutKey: string };
type State = { source: ReactNode; entries: LayoutEntry[] };
type Box = { left: number; top: number; width: number; height: number; opacity: number };
type Snapshot = Map<string, Box> | null;
type OwnedStyle = { name: string; value: string; priority: string; written: string };

/**
 * The pre-commit snapshot is intentional: an effect cleanup runs after DOM mutations and
 * cannot capture the old layout, especially while an earlier move is still running.
 * This bridge adds no DOM. GridItem keys own presence; the browser owns interpolation.
 */
export class GridLayoutItems extends Component<Props, State, Snapshot> {
  override state: State = { source: this.props.children, entries: layoutEntries(this.props.children) };
  private animations = new Map<HTMLElement, { animation: Animation; timer: ReturnType<typeof setTimeout> }>();
  private styles = new Map<HTMLElement, OwnedStyle[]>();
  private media: MediaQueryList | null = null;
  private mounted = false;

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.children === state.source) return null;
    return { source: props.children, entries: retainLayoutExits(state.entries, layoutEntries(props.children)) };
  }

  override componentDidMount() {
    this.mounted = true;
    this.media = window.matchMedia(MEDIA_QUERY.reducedMotion);
    this.media.addEventListener('change', this.reduceMotion);
  }

  override componentWillUnmount() {
    this.mounted = false;
    this.media?.removeEventListener('change', this.reduceMotion);
    this.cancelAnimations();
    this.styles.forEach((_value, node) => this.restoreStyle(node));
  }

  override getSnapshotBeforeUpdate(previous: Props): Snapshot {
    if (previous.children === this.props.children && previous.layoutKey === this.props.layoutKey) return null;
    const host = this.props.host.current;
    if (!host || prefersReducedMotion()) return null;
    // All reads precede mutation: actual visual boxes include interrupted WAAPI moves.
    return new Map(this.nodes().map(([key, node]) => {
      const rect = node.getBoundingClientRect();
      return [key, { left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: Number(getComputedStyle(node).opacity) }];
    }));
  }

  override componentDidUpdate(_previous: Props, _state: State, snapshot: Snapshot) {
    if (prefersReducedMotion()) { this.reduceMotion(); return; }
    if (!snapshot) return;
    const host = this.props.host.current;
    if (!host) return;
    const duration = this.props.options.duration === undefined ? readMotionDefaultMs('grid', 'duration', host) : readMotionTimeMs(this.props.options.duration, host);
    if (!duration || typeof host.animate !== 'function') { this.settle(); return; }
    const nodes = this.nodes();
    const exiting = new Set(this.state.entries.filter((entry) => entry.exiting).map((entry) => entry.key));
    this.cancelAnimations();
    nodes.forEach(([key, node]) => { if (!exiting.has(key)) this.restoreStyle(node); });
    // One post-commit layout read batch, followed by writes/animation starts only.
    const root = host.getBoundingClientRect();
    const boxes = nodes.map(([key, node]) => ({ key, node, box: node.getBoundingClientRect() }));
    const easing = getComputedStyle(host).getPropertyValue('--t-t-f-cubic-bezier').trim() || 'ease';
    const step = this.props.options.stagger === undefined ? readMotionDefaultMs('grid', 'stagger', host) : readMotionTimeMs(this.props.options.stagger, host);
    const distance = motionDistanceCss(this.props.options.distance ?? motionDefaults.grid.distance);
    let entering = 0;
    for (const { key, node, box } of boxes) {
      const old = snapshot.get(key);
      if (exiting.has(key)) {
        if (!old || !this.onScreen(old)) { this.removeExit(key); continue; }
        this.positionExit(node, old, root, host);
        this.play(node, [{ opacity: old.opacity, translate: '0px 0px', scale: '1 1' },
          { opacity: 0, translate: `0px calc(${distance} * -1)`, scale: '1 1' }], duration, 0, easing, () => this.removeExit(key));
      } else if (!old) {
        if (this.onScreen(box)) this.play(node, [{ opacity: 0, translate: `0px ${distance}`, scale: '1 1' },
          { opacity: 1, translate: '0px 0px', scale: '1 1' }], duration, entering++ * step, easing);
      } else if (box.width && box.height && (this.onScreen(old) || this.onScreen(box))) {
        const x = old.left - box.left;
        const y = old.top - box.top;
        const sx = old.width / box.width;
        const sy = old.height / box.height;
        const moved = Math.abs(x) > 0.5 || Math.abs(y) > 0.5 || Math.abs(old.width - box.width) > 0.5 || Math.abs(old.height - box.height) > 0.5;
        if (moved || old.opacity < 0.999) {
          const frames: Keyframe[] = [{ translate: `${x}px ${y}px`, scale: `${sx} ${sy}` }, { translate: '0px 0px', scale: '1 1' }];
          // A survivor never fades out; an interrupted entry continues from its current opacity.
          if (old.opacity < 0.999) { frames[0] = { ...frames[0], opacity: old.opacity }; frames[1] = { ...frames[1], opacity: 1 }; }
          this.play(node, frames, duration, 0, easing);
        }
      }
    }
  }

  private nodes(): [string, HTMLElement][] {
    return Array.from(this.props.host.current?.children ?? []).flatMap((node) => {
      const key = node.getAttribute('data-grid-layout-key');
      return node instanceof HTMLElement && key !== null ? [[key, node] as [string, HTMLElement]] : [];
    });
  }

  private onScreen(box: Pick<Box, 'top' | 'height'>) {
    return box.height > 0 && box.top < window.innerHeight && box.top + box.height > 0;
  }

  private removeExit(key: string) {
    if (!this.mounted || !this.state.entries.some((entry) => entry.key === key && entry.exiting)) return;
    this.nodes().forEach(([id, node]) => { if (id === key) this.restoreStyle(node); });
    this.setState((state) => ({ entries: state.entries.filter((entry) => entry.key !== key || !entry.exiting) }));
  }

  private reduceMotion = () => {
    if (!prefersReducedMotion()) return;
    this.settle();
  };

  private settle() {
    this.cancelAnimations();
    this.styles.forEach((_value, node) => this.restoreStyle(node));
    if (this.mounted && this.state.entries.some((entry) => entry.exiting)) {
      this.setState((state) => ({ entries: state.entries.filter((entry) => !entry.exiting) }));
    }
  }

  private cancelAnimations() {
    this.animations.forEach(({ animation, timer }) => { clearTimeout(timer); animation.cancel(); });
    this.animations.clear();
  }

  private play(node: HTMLElement, frames: Keyframe[], duration: number, delay: number, easing: string, done?: () => void) {
    const animation = node.animate(frames, { duration, delay, easing, fill: 'both' });
    const finish = () => {
      const running = this.animations.get(node);
      if (running?.animation !== animation) return;
      clearTimeout(running.timer);
      this.animations.delete(node);
      animation.cancel();
      done?.();
    };
    this.animations.set(node, { animation, timer: setTimeout(finish, duration + delay + MOTION_END_BUFFER_MS) });
    animation.onfinish = finish;
  }

  private positionExit(node: HTMLElement, box: Box, root: DOMRect, host: HTMLElement) {
    const values = { left: `${box.left - root.left - host.clientLeft}px`, top: `${box.top - root.top - host.clientTop}px`, width: `${box.width}px`, height: `${box.height}px` };
    if (!this.styles.has(node)) this.styles.set(node, Object.keys(values).map((name) => ({ name, value: node.style.getPropertyValue(name), priority: node.style.getPropertyPriority(name), written: '' })));
    for (const saved of this.styles.get(node) ?? []) {
      const value = values[saved.name as keyof typeof values];
      node.style.setProperty(saved.name, value);
      saved.written = value;
    }
  }

  private restoreStyle(node: HTMLElement) {
    for (const saved of this.styles.get(node) ?? []) {
      if (node.style.getPropertyValue(saved.name) !== saved.written) continue;
      if (saved.value) node.style.setProperty(saved.name, saved.value, saved.priority);
      else node.style.removeProperty(saved.name);
    }
    this.styles.delete(node);
  }

  override render() {
    return this.state.entries.map(({ key, element, exiting }) => cloneElement(element, {
      key, 'data-grid-layout-key': key, 'data-grid-layout-exit': exiting ? '' : undefined,
      inert: exiting || element.props.inert,
    } as Partial<typeof element.props>));
  }
}
