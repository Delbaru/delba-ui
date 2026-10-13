import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { Input } from '../../src/components/Input/Input';
import { Flex } from '../../src/components/Flex/Flex';
import { Text } from '../../src/components/Text/Text';
import { Dropdown } from '../../src/components/Dropdown/Dropdown';
import { Button } from '../../src/components/Button/Button';
import { Select } from '../../src/components/Select/Select';
import type { CollapseControls } from '../../src/hooks/useCollapseControls';

declare global {
  interface Window {
    __collapseCommands: {
      panel: CollapseControls | null;
      controlled: CollapseControls | null;
      readonly: CollapseControls | null;
      text: CollapseControls | null;
      dropdown: CollapseControls | null;
      select: CollapseControls | null;
      updateText: (text: string) => void;
      input: HTMLInputElement | null;
      cleanups: number;
      showAndFocus: () => Promise<{ status?: string; focused: boolean; settled: boolean }>;
      drop: () => void;
      accept: (accept: boolean) => void;
      setControlledOpen: (open: boolean) => void;
    };
  }
}

export function CollapseControlsFixture() {
  const panel = useRef<CollapseControls>(null);
  const input = useRef<HTMLInputElement>(null);
  const controlled = useRef<CollapseControls>(null);
  const readonly = useRef<CollapseControls>(null);
  const text = useRef<CollapseControls>(null);
  const dropdown = useRef<CollapseControls>(null);
  const select = useRef<CollapseControls>(null);
  const [textContent, setTextContent] = useState('Retained command text');
  const [visible, setVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [accept, setAccept] = useState(true);
  const [appearEnds, setAppearEnds] = useState(0);
  const cleanups = useRef(0);
  const panelRef = useCallback((handle: CollapseControls | null) => {
    panel.current = handle;
    return () => {
      panel.current = null;
      cleanups.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    window.__collapseCommands = {
      get panel() { return panel.current; },
      get controlled() { return controlled.current; },
      get readonly() { return readonly.current; },
      get text() { return text.current; },
      get dropdown() { return dropdown.current; },
      get select() { return select.current; },
      updateText: setTextContent,
      get input() { return input.current; },
      get cleanups() { return cleanups.current; },
      showAndFocus: async () => {
        const result = await panel.current?.show();
        if (result?.status === 'finished') input.current?.focus();
        return {
          status: result?.status,
          focused: document.activeElement === input.current,
          settled: input.current?.closest('.ui-collapse')?.hasAttribute('data-settled') ?? false,
        };
      },
      drop: () => setVisible(false),
      accept: setAccept,
      setControlledOpen: setOpen,
    };
  });

  return (
    <section aria-label="Collapse commands" className="fixture" style={{ '--t-d-fast': '0.35s' } as CSSProperties}>
      {visible && (
        <Input
          ref={input}
          label="Command field"
          comment="Command field description"
          collapse={{ defaultOpen: false, ref: panelRef, fade: true }}
        />
      )}
      <Input
        label="Controlled command field"
        collapse={{ open, ref: controlled, onOpenChange: (next) => { if (accept) setOpen(next); } }}
      />
      <Input label="Readonly command field" collapse={{ open: false, ref: readonly, keepMounted: true }} />
      <Text collapse={{ defaultOpen: false, ref: text, keepMounted: true }}>{textContent}</Text>
      <Dropdown
        trigger={<Button data-testid="root-dropdown-trigger">Root dropdown</Button>}
        panel={{ portal: true }}
        collapse={{ defaultOpen: false, ref: dropdown, keepMounted: true }}
      ><Text>Root portal content</Text></Dropdown>
      <Select
        aria-label="Collapsed select"
        options={[{ value: 'one', label: 'Root one' }, { value: 'two', label: 'Root two' }]}
        collapse={{ defaultOpen: false, ref: select, keepMounted: true }}
      />
      <Flex collapse={{ defaultOpen: true, appear: true, onEnd: () => setAppearEnds((count) => count + 1) }}>
        <Text>Initial appearance</Text>
      </Flex>
      <output data-testid="appear-ends">{appearEnds}</output>
    </section>
  );
}
