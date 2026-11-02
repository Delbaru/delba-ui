import { useRef, useState } from 'react';
import { useInView } from '../../src/core/useInView';

export function InViewObjectRefFixture() {
  const target = useRef<HTMLDivElement>(null);
  const [visibleTarget, setVisibleTarget] = useState(true);
  const { isInView } = useInView(target);

  return (
    <section aria-label="Object ref observer contract">
      <button
        type="button"
        data-testid="replace-object-ref-target"
        onClick={() => setVisibleTarget(false)}
      >
        Replace observer target
      </button>
      <div
        key={visibleTarget ? 'visible' : 'offscreen'}
        ref={target}
        data-testid="object-ref-target"
        style={{
          position: 'fixed',
          top: visibleTarget ? 40 : 2000,
          left: 0,
          width: 10,
          height: 10,
        }}
      />
      <output data-testid="object-ref-in-view">{String(isInView)}</output>
    </section>
  );
}
