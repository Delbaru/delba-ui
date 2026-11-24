import { useEffect, useRef, useState } from 'react';
import { Dropdown } from '../../src/components/Dropdown';
import { Select } from '../../src/components/Select';
import { Flex } from '../../src/components/Flex';
import { ui } from '../../src/ui';

function SearchSelectFixture() {
  const [query, setQuery] = useState('');
  const [value, setValue] = useState<string | null>('saved');
  const [loading, setLoading] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [options, setOptions] = useState([{ value: 'saved', label: 'Saved city' }]);
  useEffect(() => {
    if (!query) return;
    const timer = window.setTimeout(() => {
      setOptions([{ value: `${query}-1`, label: `${query} First` }, { value: `${query}-2`, label: `${query} Second` }]);
      setLoading(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <form aria-label="Search select form" style={{ maxWidth: 360 }}>
    <label><input type="checkbox" checked={keepOpen} onChange={event => setKeepOpen(event.target.checked)} />Keep selection open</label>
    <Select
        aria-label="Async city"
        name="city"
        value={value}
        onChange={setValue}
        search={{ value: query, placeholder: 'Find city', onChange(next) {
          setQuery(next);
          setLoading(true);
          setOptions([]);
        } }}
        options={options}
        loading={loading}
        closeOnSelect={!keepOpen}
        required
        w={['100%', '100%', '100%']}
        h={[44, 44, 44]}
        p={[[12, 16], [12, 16], [12, 16]]}
        r={[0, 0, 0]}
        border={['1px solid var(--line)', '1px solid var(--line)', '1px solid var(--line)']}
        panel={{ r: [0, 0, 0] }}
    />
    <button type="button" style={{ marginTop: 300 }}>Outside searchable select</button>
  </form>;
}

function LongSearchSelectFixture() {
  const [query, setQuery] = useState('Раменское');
  return <div style={{ position: 'fixed', bottom: 12, left: 64, right: 64 }}>
    <Select
        search={{ value: query, onChange: setQuery, placeholder: 'Населённый пункт' }}
        options={[
          { value: '0', label: 'Раменское' },
          { value: '1', label: 'Московская обл, г Раменское' },
          { value: '2', label: 'Тверская обл, г Ржев, деревня Раменское' },
          { value: '3', label: 'Красноярский край, Пировский р-н, деревня Раменское' },
        ]}
        w={['100%', '100%', '100%']}
        h={[44, 44, 44]}
        p={[[12, 16], [12, 16], [12, 16]]}
        r={[0, 0, 0]}
        border={['1px solid var(--line)', '1px solid var(--line)', '1px solid var(--line)']}
        panel={{ r: [0, 0, 0], minH: [152, 152, 152], maxH: [152, 152, 152] }}
    />
  </div>;
}

function PopupDoorFixture() {
  const [enabled, setEnabled] = useState(true);
  const collapse = ui.collapse.use({ defaultOpen: true });
  return <section aria-label="Popup door fixture">
    <button type="button" onClick={collapse.toggle}>Toggle popup surface</button>
    <button type="button" onClick={() => setEnabled(v => !v)}>Toggle popup mechanism</button>
    <Flex role="button" aria-label="Popup menu trigger" ui={{
      collapse,
      popup: enabled ? {
        preset: 'menu', label: 'Popup door actions',
        children: <button type="button" role="menuitem">Popup door action</button>,
      } : undefined,
    }}>Open menu</Flex>
    <Flex role="button" aria-label="Hover popup trigger" ui={{ popup: {
      preset: 'menu', on: 'hover', label: 'Hover popup actions',
      children: <button type="button" role="menuitem">Hover popup action</button>,
    } }}>Hover or tap</Flex>
    <Flex aria-label="Context popup trigger" ui={{ popup: {
      preset: 'context', label: 'Context popup actions',
      children: <button type="button" role="menuitem">Context popup action</button>,
    } }}>Right click or keyboard</Flex>
  </section>;
}

export function DropdownOpenFixture() {
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [accept, setAccept] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [point, setPoint] = useState<{ x: number; y: number; target: HTMLElement } | null>(null);
  if (location.hash === '#long-search') return <LongSearchSelectFixture />;
  return <section aria-label="Animated dropdown contracts" style={{ padding: 20 }}>
    <PopupDoorFixture />
    <SearchSelectFixture />
    <button onClick={(event) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      setPoint({ x: rect.left, y: rect.bottom, target });
    }}>Point menu opener</button>
    <button>Outside point menu</button>
    <Dropdown
        point={point}
        open={point !== null}
        onOpenChange={(next) => { if (!next && accept) setPoint(null); }}
        initialFocus="first"
        panel={{ 'data-testid': 'point-menu-surface', style: { padding: 16, background: 'white' } }}
    >{point && <button>Point menu action</button>}</Dropdown>
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
    <Dropdown
        style={{ width: 440 }}
        blockOutsideClick
        trigger={<button style={{ width: '100%' }}>Wide dropdown anchor</button>}
        panel={{ portal: true, matchTriggerWidth: true, keepMounted: false,
          'data-testid': 'narrow-dropdown-surface', style: { width: 180, padding: 12, background: 'white' } }}
    >
      <button>Inside narrow surface</button>
      <Dropdown trigger={<button>Nested narrow dropdown</button>}
        panel={{ portal: true, keepMounted: false, 'data-testid': 'nested-narrow-surface', style: { padding: 12, background: 'white' } }}
      ><button>Nested narrow item</button></Dropdown>
    </Dropdown>
  </section>;
}
