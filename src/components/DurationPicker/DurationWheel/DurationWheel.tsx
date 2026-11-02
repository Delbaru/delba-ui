'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { clamp, cx } from '../../../core';
import { readMotionTimeMs } from '../../../core/base/timing';
import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { useTextSwap } from '../../Text/animations/textReveal/useTextSwap';
import styles from './DurationWheel.module.scss';

const WHEEL_STEP_PX = 24;
const LINE_DELTA_PX = 16;
const PAGE_DELTA_PX = 160;

interface WheelProps {
  value: number;
  max: number;
  label: string;
  disabled: boolean;
  onChange(value: number): void;
}

interface WheelLayer {
  value: number;
  kind: 'in' | 'out' | 'rest';
}

interface WheelController {
  value: number;
  max: number;
  disabled: boolean;
  onChange(value: number): void;
}

interface DragState {
  startY: number;
  startValue: number;
  moved: boolean;
}

/** A bounded spinbutton with wheel, pointer, click, keyboard, and directional value motion. */
export function DurationWheel({ value, max, label, disabled, onChange }: WheelProps) {
  const node = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const latest = useRef<WheelController>({ value, max, disabled, onChange });
  const [motionDuration, setMotionDuration] = useState(0);

  useLayoutEffect(() => {
    setMotionDuration(readMotionTimeMs('fast', node.current ?? undefined));
  }, []);

  useEffect(() => {
    latest.current = { value, max, disabled, onChange };
  }, [disabled, max, onChange, value]);

  useEffect(() => {
    const wheelNode = node.current;
    if (!wheelNode) return undefined;

    let accumulatedDelta = 0;
    const handleWheel = (event: WheelEvent) => {
      const current = latest.current;
      if (current.disabled || event.deltaY === 0) return;

      event.preventDefault();
      const deltaScale = event.deltaMode === 1
        ? LINE_DELTA_PX
        : event.deltaMode === 2
          ? PAGE_DELTA_PX
          : 1;
      accumulatedDelta += event.deltaY * deltaScale;
      if (Math.abs(accumulatedDelta) < WHEEL_STEP_PX) return;

      const direction = Math.sign(accumulatedDelta);
      current.onChange(clamp(current.value + direction, 0, current.max));
      accumulatedDelta = 0;
    };

    wheelNode.addEventListener('wheel', handleWheel, { passive: false });
    return () => wheelNode.removeEventListener('wheel', handleWheel);
  }, []);

  const swap = useTextSwap(String(value), { durationMs: motionDuration, staggerMs: 0 });
  const currentValue = Number(swap.current);
  const previousValue = swap.previous === null ? null : Number(swap.previous);
  const direction = previousValue === null || currentValue > previousValue ? 1 : -1;
  const motionStyle = { '--duration-direction': direction } as CSSProperties;

  function change(nextValue: number) {
    if (disabled) return;
    onChange(clamp(nextValue, 0, max));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nextValue = event.key === 'ArrowUp' ? value + 1
      : event.key === 'ArrowDown' ? value - 1
        : event.key === 'PageUp' ? value + 10
          : event.key === 'PageDown' ? value - 10
            : event.key === 'Home' ? 0
              : event.key === 'End' ? max
                : null;
    if (nextValue === null || disabled) return;

    event.preventDefault();
    event.stopPropagation();
    change(nextValue);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;

    event.currentTarget.focus();
    drag.current = { startY: event.clientY, startValue: value, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const currentDrag = drag.current;
    if (!currentDrag) return;

    const steps = Math.trunc((currentDrag.startY - event.clientY) / WHEEL_STEP_PX);
    if (steps !== 0) currentDrag.moved = true;
    if (currentDrag.moved) change(currentDrag.startValue + steps);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const currentDrag = drag.current;
    drag.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!currentDrag || currentDrag.moved) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const cellHeight = bounds.height / 3;
    const offset = Math.floor((event.clientY - bounds.top) / cellHeight) - 1;
    change(value + offset);
  }

  function renderLayer(layer: WheelLayer) {
    return (
      <Flex
          key={`${swap.generation}-${layer.kind}`}
          position={['absolute', 'absolute', 'absolute']}
          top={[0, 0, 0]}
          left={[0, 0, 0]}
          dir={['column', 'column', 'column']}
          className={cx('DurationWheelLayer', styles.Layer, 'ui-duration-wheel-layer')}
          data-motion={layer.kind}
          aria-hidden="true"
      >
        {[-1, 0, 1].map((offset) => renderValue(layer.value, offset))}
      </Flex>
    );
  }

  function renderValue(layerValue: number, offset: number) {
    const nextValue = layerValue + offset;
    const isSelected = offset === 0;

    return (
      <Flex
          key={offset}
          h={[24, 24, 24]}
          w={[48, 48, 48]}
          justify={['center', 'center', 'center']}
          align={['center', 'center', 'center']}
          r={[8, 8, 8]}
          aria-hidden="true"
          state={isSelected ? 'selected' : undefined}
      >
        <Text
            variant={['small', 'small', 'small']}
            fontWeight={isSelected ? [600, 600, 600] : undefined}
            color={isSelected ? 'var(--text)' : 'var(--text-muted)'}
        >
          {nextValue < 0 || nextValue > max ? '\u00a0' : String(nextValue).padStart(2, '0')}
        </Text>
      </Flex>
    );
  }

  const layers: WheelLayer[] = [
    ...(previousValue === null ? [] : [{ value: previousValue, kind: 'out' as const }]),
    { value: currentValue, kind: previousValue === null ? 'rest' : 'in' },
  ];

  return (
    <Flex
        ref={node}
        dir={['column', 'column', 'column']}
        w={[48, 48, 48]}
        h={[72, 72, 72]}
        r={[4, 4, 4]}
        className={cx('DurationWheel', styles.DurationWheel, 'ui-duration-wheel')}
        style={motionStyle}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${label}`}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
    >
      {layers.map(renderLayer)}
    </Flex>
  );
}
