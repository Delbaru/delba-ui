'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type CSSProperties } from 'react';
import { clamp, cx } from '../../core';
import { readMotionTimeMs } from '../../core/base/timing';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { useTextSwap } from '../Text/animations/textReveal/useTextSwap';
import './DurationPicker.scss';

export interface DurationPickerProps {
  /** Controlled duration in whole minutes. */
  value: number;
  /** Called after a wheel, pointer, click or keyboard change. */
  onValueChange: (minutes: number) => void;
  /** Inclusive duration limit, in minutes. Defaults to 24 hours. */
  maxMinutes?: number;
  /** Disables both wheels and removes them from keyboard navigation. */
  disabled?: boolean;
  /** Accessible name of the whole control. */
  'aria-label'?: string;
  /** Localized accessible names of the hour and minute wheels. */
  labels?: { hours: string; minutes: string };
  /** Additional root class. */
  className?: string;
  /** Reference to the stable root DOM node. */
  ref?: ComponentProps<typeof Flex>['ref'];
}

function Wheel({ value, max, label, disabled, onChange }: {
  value: number; max: number; label: string; disabled: boolean; onChange: (value: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [motionMs, setMotionMs] = useState(0);
  useLayoutEffect(() => { setMotionMs(readMotionTimeMs('fast', node.current ?? undefined)); }, []);
  const swap = useTextSwap(String(value), { durationMs: motionMs, staggerMs: 0 });
  const current = Number(swap.current);
  const previous = swap.previous === null ? null : Number(swap.previous);
  const motionStyle = { '--duration-direction': previous === null || current > previous ? 1 : -1 } as CSSProperties;
  const latest = useRef({ value, max, onChange, disabled });
  const drag = useRef<{ y: number; from: number; moved: boolean } | null>(null);
  useEffect(() => { latest.current = { value, max, onChange, disabled }; }, [value, max, onChange, disabled]);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    let distance = 0;
    const wheel = (event: WheelEvent) => {
      const current = latest.current;
      if (current.disabled || !event.deltaY) return;
      event.preventDefault();
      distance += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
      if (Math.abs(distance) < 24) return;
      current.onChange(clamp(current.value + Math.sign(distance), 0, current.max));
      distance = 0;
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const change = (next: number) => { if (!disabled) onChange(clamp(next, 0, max)); };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === 'ArrowUp' ? value + 1 : event.key === 'ArrowDown' ? value - 1
      : event.key === 'PageUp' ? value + 10 : event.key === 'PageDown' ? value - 10
      : event.key === 'Home' ? 0 : event.key === 'End' ? max : null;
    if (next === null || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    change(next);
  };
  return <Flex ref={node} dir={['column', 'column', 'column']} w={[48, 48, 48]} h={[72, 72, 72]} r={[4, 4, 4]} className="ui-duration-wheel" style={motionStyle}
      role="spinbutton" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      aria-valuetext={`${value} ${label}`} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
      onKeyDown={key} onPointerDown={event => {
        if (disabled || event.button !== 0) return;
        event.currentTarget.focus();
        drag.current = { y: event.clientY, from: value, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={event => {
        const current = drag.current;
        if (!current) return;
        const steps = Math.trunc((current.y - event.clientY) / 24);
        if (steps) current.moved = true;
        if (current.moved) change(current.from + steps);
      }} onPointerUp={event => {
        const current = drag.current;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (current && !current.moved) {
          const bounds = event.currentTarget.getBoundingClientRect();
          const offset = Math.floor((event.clientY - bounds.top) / (bounds.height / 3)) - 1;
          change(value + offset);
        }
      }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      {[...(previous === null ? [] : [{ value: previous, kind: 'out' }]), { value: current, kind: previous === null ? 'rest' : 'in' }].map(layer => <Flex
          key={`${swap.generation}-${layer.kind}`}
          position={['absolute', 'absolute', 'absolute']}
          top={[0, 0, 0]}
          left={[0, 0, 0]}
          dir={['column', 'column', 'column']}
          className="ui-duration-wheel-layer"
          data-motion={layer.kind}
          aria-hidden="true"
      >
      {[-1, 0, 1].map(offset => <Flex
          key={offset}
          h={[24, 24, 24]}
          w={[48, 48, 48]}
          justify={['center', 'center', 'center']}
          align={['center', 'center', 'center']}
          r={[8, 8, 8]}
          aria-hidden="true"
          state={offset === 0 ? 'selected' : undefined}
      >
        <Text
            variant={['small', 'small', 'small']}
            fontWeight={offset === 0 ? [600, 600, 600] : undefined}
            color={offset === 0 ? 'var(--text)' : 'var(--text-muted)'}
        >
          {layer.value + offset < 0 || layer.value + offset > max ? '\u00a0' : String(layer.value + offset).padStart(2, '0')}
        </Text>
      </Flex>)}
      </Flex>)}
  </Flex>;
}

/** Two compact wheels with a directional content swap and no time-of-day rollover. */
export function DurationPicker({ value, onValueChange, maxMinutes = 1440, disabled = false,
  labels = { hours: 'Hours', minutes: 'Minutes' }, className, ref, 'aria-label': ariaLabel = 'Duration' }: DurationPickerProps) {
  const max = Number.isFinite(maxMinutes) ? Math.max(0, Math.round(maxMinutes)) : 1440;
  const total = clamp(Number.isFinite(value) ? Math.round(value) : 0, 0, max);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return <Flex
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className={cx('ui-duration-picker', className)}
      position={['relative', 'relative', 'relative']}
      w={['max-content', 'max-content', 'max-content']}
      maxW={[128, 128, 128]}
      gap={[4, 4, 4]}
      p={[4, 4, 4]}
      r={[8, 8, 8]}
      bg={['var(--background)', 'var(--background)', 'var(--background)']}
      border={['1px solid var(--line)', '1px solid var(--line)', '1px solid var(--line)']}
  >
    <Flex
        position={['absolute', 'absolute', 'absolute']}
        top={['50%', '50%', '50%']}
        left={[4, 4, 4]}
        right={[4, 4, 4]}
        h={[24, 24, 24]}
        r={[4, 4, 4]}
        className="ui-duration-selected-band"
        aria-hidden="true"
    />
    <Wheel
        value={hours}
        max={Math.floor(max / 60)}
        label={labels.hours}
        disabled={disabled}
        onChange={next => onValueChange(Math.min(max, next * 60 + minutes))}
    />
    <Flex
        position={['relative', 'relative', 'relative']}
        w={[8, 8, 8]}
        h={[72, 72, 72]}
        align={['center', 'center', 'center']}
        justify={['center', 'center', 'center']}
        aria-hidden="true"
    >
      <Text variant={['small', 'small', 'small']} fontWeight={[600, 600, 600]} color="var(--text)">:</Text>
    </Flex>
    <Wheel
        value={minutes}
        max={hours === Math.floor(max / 60) ? max % 60 : 59}
        label={labels.minutes}
        disabled={disabled}
        onChange={next => onValueChange(hours * 60 + next)}
    />
  </Flex>;
}
