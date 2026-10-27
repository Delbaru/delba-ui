import { useRef, useState } from 'react';
import { Dropdown } from '../../src/components/Dropdown';
import { Select } from '../../src/components/Select';

export function DropdownOpenFixture() {
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [accept, setAccept] = useState(true);
  const [mounted, setMounted] = useState(true);
  return <section aria-label="Animated dropdown contracts" style={{ padding: 20 }}>
    <Select
      aria-label="Animated select"
      options={[{ value: 'one', label: 'First option' }, { value: 'two', label: 'Second option' }]}
      defaultValue="one"
      w={[240, 240, 240]}
      h={[44, 44, 44]}
      panel={{ r: [0, 0, 0], animate: { when: 'open', effect: 'down', distance: 8, duration: 0.2 } }}
    />
    <label><input
        type="checkbox"
        checked={accept}
        onChange={(event) => setAccept(event.target.checked)}
    />Accept dropdown state</label>
    <button onClick={() => setOpen((value) => !value)}>External dropdown state</button>
    <button onClick={() => setMounted((value) => !value)}>Mount animated dropdown</button>
    <div
        ref={anchor}
        data-testid="dropdown-geometry-anchor"
        style={{ position: 'relative', width: 720, padding: 12, border: '3px solid black' }}
    >
      <div style={{ marginLeft: 120 }}>
        {mounted && <Dropdown
          open={open}
          onOpenChange={(next) => { if (accept || next) setOpen(next); }}
          trigger={<button>Animated dropdown</button>}
          panel={{ portal: true, anchorRef: anchor, viewportPadding: 0, offset: 0, matchTriggerWidth: true,
            keepMounted: false, animate: { when: 'open', effect: 'down', distance: 24, duration: 0.4 },
            'data-testid': 'animated-dropdown-surface', style: { padding: 20, background: 'white' } }}
        ><button>Animated dropdown item</button></Dropdown>}
        <Dropdown trigger={<button>Retained animated dropdown</button>}
          panel={{ keepMounted: true, anchorRef: anchor, offset: 0, matchTriggerWidth: true,
            animate: { when: 'open', effect: 'fade', duration: 0.2 },
            'data-testid': 'retained-dropdown-surface', style: { padding: 16, background: 'white' } }}
        ><button>Retained dropdown item</button></Dropdown>
      </div>
    </div>
    <Dropdown
        trigger={<button>Backdrop dropdown</button>}
        backdrop={{ className: 'fixture-dropdown-backdrop', style: { background: 'rgba(0,0,0,.15)' } }}
        panel={{ portal: true, keepMounted: false, animate: { when: 'open', effect: 'fade', duration: 'fast' } }}
    ><button>Backdrop dropdown item</button></Dropdown>
  </section>;
}
