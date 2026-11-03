import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { decodeHtmlEntities, prefersReducedMotion } from '../../../core';
import { motionTimeCss, readMotionTimeMs } from '../../../core/base/timing';
import { readMotionDefaultMs } from '../../../core/base/motion-config';
import { Box } from '../../Box';
import { renderBlocks } from '../RichText.content';
import { parseLegacyRichText } from '../legacy-html';
import type { RichTextChangeAnimate } from '../RichText.types';
import styles from './RichTextSequence.module.scss';

export function RichTextSequence({ sequence, links }: {
  sequence: RichTextChangeAnimate;
  links: 'active' | 'text';
}) {
  const steps = useMemo(() => sequence.steps.map(step => parseLegacyRichText(decodeHtmlEntities(step), links)), [sequence.steps, links]);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const [shown, setShown] = useState(sequence.currentStep);
  const [clip, setClip] = useState('inset(0 0 0 0)');
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useLayoutEffect(() => {
    const nodes = items.current.slice(0, sequence.steps.length);
    const measure = () => {
      const next = nodes.map(node => node?.offsetHeight ?? 0);
      setHeights(current => current.length === next.length && current.every((value, index) => value === next[index]) ? current : next);
    };
    measure();
    const view = nodes.find(node => node)?.ownerDocument.defaultView;
    const observer = view?.ResizeObserver ? new view.ResizeObserver(measure) : undefined;
    nodes.forEach(node => { if (node) observer?.observe(node); });
    return () => observer?.disconnect();
  }, [sequence.steps]);

  const duration = sequence.duration;
  const durationMs = duration === undefined ? readMotionDefaultMs('textClip', 'duration') : readMotionTimeMs(duration);

  useEffect(() => {
    if (sequence.effect !== 'textClip') return undefined;
    const step = sequence.currentStep;
    if (step === shownRef.current || prefersReducedMotion()) {
      setShown(step);
      setClip('inset(0 0 0 0)');
      return undefined;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (callback: () => void, delay: number) => timers.push(setTimeout(callback, delay));
    later(() => {
      setClip('inset(0 0 100% 0)');
      later(() => {
        setShown(step);
        setClip('inset(100% 0 0 0)');
        later(() => setClip('inset(0 0 0 0)'), 0);
      }, durationMs);
    }, 0);
    return () => timers.forEach(clearTimeout);
  }, [sequence.effect, sequence.currentStep, durationMs]);

  const sliding = sequence.effect === 'textSlide';
  const top = heights.slice(0, sequence.currentStep).reduce((sum, height) => sum + height, 0);
  const slideDuration = duration === undefined ? 'var(--t-m-text-slide-sequence-duration)' : motionTimeCss(duration);
  const clipHeight = heights.length > 0 ? Math.max(...heights) : 0;

  return (
    <Box
        className={styles.RichTextSequence}
        data-effect={sequence.effect}
        style={sliding ? {
          height: heights[sequence.currentStep] ?? 0,
          transform: `translateY(-${top}px)`,
          transitionDuration: slideDuration,
        } : {
          height: clipHeight || sequence.clipHeight || 'auto',
          clipPath: clip,
          transitionDuration: `${durationMs}ms`,
        }}
    >
      {steps.map((blocks, index) => (
        <Box
            key={index}
            ref={node => { items.current[index] = node; }}
            className={styles.item}
            style={{
              top: sliding ? heights.slice(0, index).reduce((sum, height) => sum + height, 0) : 0,
              opacity: sliding || index === shown ? 1 : 0,
            }}
        >
          {renderBlocks(blocks)}
        </Box>
      ))}
    </Box>
  );
}
