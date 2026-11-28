'use client';

import { createContext, useCallback, useContext, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { resolveResponsiveWithDefaults } from '../base/responsive';
import type { WithRef } from '../base/with-ref';
import { type ComponentStateValue, mergeComponentStates, normalizeComponentState } from '../component-state';
import { composeEventHandlers } from '../composeEventHandlers';
import { useNavigation } from '../Navigation';
import { holdVisibleScrollPosition } from '../Scroll/Position';
import { useMergedRefs } from '../useMergedRefs';
import type {
  DisclosureDefinition,
  DisclosureHeading,
  DisclosureItemProps,
  DisclosureProps,
} from './Disclosure.types';
import { disclosureKeys, nextDisclosureKeys } from './Selection';

const ROOT = 'data-ui-disclosure';

export interface DisclosureController {
  readonly definition: DisclosureDefinition;
  readonly headingAs: DisclosureHeading;
  readonly indicator: ReactNode;
  register(node: HTMLElement): () => void;
  isOpen(value: string): boolean;
  isLocked(value: string): boolean;
  toggle(value: string, trigger: HTMLElement): void;
  reveal(value: string): void;
}

const DisclosureContext = createContext<DisclosureController | null>(null);

export function DisclosureScope({ disclosure, children }: { disclosure: DisclosureController; children: ReactNode }) {
  return <DisclosureContext.Provider value={disclosure}>{children}</DisclosureContext.Provider>;
}

function surfaceUi(ui: DisclosureProps['ui']) {
  if (!ui) return undefined;
  return { ...ui, collapse: undefined, disclosure: undefined };
}

export function useDisclosure(definition: DisclosureDefinition, props: WithRef<DisclosureProps, HTMLElement>) {
  const {
    ref,
    id,
    ui,
    dir,
    onKeyDown,
    multiple,
    value,
    defaultValue,
    onValueChange: _onValueChange,
    collapsible = definition.defaults.collapsible,
    indicator,
    headingAs = definition.defaults.headingAs,
    ...dom
  } = props;
  const rootId = useId();
  const rootNode = useRef<HTMLElement | null>(null);
  const releasePosition = useRef<(() => void) | null>(null);
  const bindRoot = useCallback((node: HTMLElement | null) => {
    if (rootNode.current !== node) {
      releasePosition.current?.();
      releasePosition.current = null;
    }
    rootNode.current = node;
  }, []);
  const rootRef = useMergedRefs(bindRoot, ref);
  const navigation = useNavigation({
    ...definition.navigation,
    boundary: `[${ROOT}]`,
    includeAriaDisabled: true,
  });
  const [inner, setInner] = useState(() => disclosureKeys(defaultValue));
  const pendingInner = useRef(inner);
  const controlled = value !== undefined;
  const keys = controlled ? disclosureKeys(value) : inner;
  const open = multiple || keys.length <= 1 ? keys : keys.slice(0, 1);
  const isOpen = (key: string) => open.includes(key);

  const change = (key: string, intent: 'toggle' | 'reveal') => {
    const current = controlled ? open : pendingInner.current;
    const active = multiple || current.length <= 1 ? current : current.slice(0, 1);
    const next = nextDisclosureKeys(active, key, intent, { multiple, collapsible });
    if (!next) return false;

    if (!controlled) {
      pendingInner.current = next;
      setInner(next);
    }
    if (props.multiple) props.onValueChange?.([...next]);
    else props.onValueChange?.(next[0] ?? null);
    return true;
  };

  const disclosure: DisclosureController = {
    definition,
    headingAs,
    indicator,
    register: navigation.register,
    isOpen,
    isLocked: key => !multiple && !collapsible && isOpen(key),
    toggle(key, trigger) {
      if (!change(key, 'toggle')) return;

      releasePosition.current?.();
      releasePosition.current = holdVisibleScrollPosition(trigger, rootNode.current);
    },
    reveal(key) {
      change(key, 'reveal');
    },
  };

  return {
    ...disclosure,
    root: {
      ...dom,
      id: id ?? rootId,
      [ROOT]: '',
      'data-state': open.length > 0 ? 'open' : 'closed',
      dir: resolveResponsiveWithDefaults(dir, definition.defaults.dir),
      href: undefined,
      collapse: undefined,
      ui: surfaceUi(ui),
      ref: rootRef,
      onKeyDown: composeEventHandlers(onKeyDown, navigation.onKeyDown, { cancelable: true }),
    },
  };
}

function disclosureState(open: boolean, authored: ComponentStateValue) {
  const states = normalizeComponentState(authored)?.split(' ').filter(state => state !== 'open');
  return mergeComponentStates(open ? 'open' : undefined, states);
}

export function useDisclosureItem(definition: DisclosureDefinition, props: WithRef<DisclosureItemProps, HTMLElement>) {
  const {
    value, headingAs, indicator, trigger, panelProps, disabled = false, children: _children, ...shell
  } = props;
  const { content: _content, onClick, ref, ui, ...button } = trigger;
  const disclosure = useContext(DisclosureContext);
  const itemId = useId();
  const register = disclosure?.register;
  const bindTrigger = useCallback((node: HTMLElement | null) => {
    if (node) return register?.(node);
    return undefined;
  }, [register]);
  const triggerRef = useMergedRefs(bindTrigger, ref);

  if (!disclosure || disclosure.definition.token !== definition.token) {
    throw new Error('Disclosure item requires a group with the same disclosure definition');
  }

  const open = disclosure.isOpen(value);
  const triggerId = `${itemId}-trigger`;
  const panelId = `${itemId}-panel`;
  const dir = definition.defaults.item?.dir ?? definition.defaults.dir;
  const defaults = definition.defaults.item?.trigger;

  return {
    root: {
      ...shell,
      dir: resolveResponsiveWithDefaults(shell.dir, dir),
      state: disclosureState(open, shell.state),
      'data-disabled': disabled || undefined,
      href: undefined,
      collapse: undefined,
      ui: surfaceUi(shell.ui),
    },
    heading: { as: headingAs ?? disclosure.headingAs },
    trigger: {
      ...button,
      id: triggerId,
      type: 'button' as const,
      role: undefined,
      href: undefined,
      disabled,
      'aria-expanded': open,
      'aria-controls': panelId,
      'aria-disabled': disabled || disclosure.isLocked(value) || undefined,
      ref: triggerRef,
      ui: ui?.popup ? { popup: ui.popup } : undefined,
      w: defaults?.w ? resolveResponsiveWithDefaults(button.w, defaults.w) : button.w,
      justifyContent: defaults?.justifyContent
        ? resolveResponsiveWithDefaults(button.justifyContent, defaults.justifyContent)
        : button.justifyContent,
      textAlign: defaults?.textAlign ? resolveResponsiveWithDefaults(button.textAlign, defaults.textAlign) : button.textAlign,
      state: disclosureState(open, button.state),
      onClick(event: MouseEvent<HTMLButtonElement>) {
        const result = onClick?.(event);
        if (!event.defaultPrevented && !disabled) disclosure.toggle(value, event.currentTarget);
        return result;
      },
    },
    panel: {
      ...panelProps,
      id: panelId,
      role: 'region',
      'aria-labelledby': triggerId,
      dir: resolveResponsiveWithDefaults(panelProps?.dir, dir),
      state: disclosureState(open, panelProps?.state),
      href: undefined,
      ui: surfaceUi(panelProps?.ui),
      collapse: {
        open,
        fade: true,
        keepMounted: true,
        onFound: () => disclosure.reveal(value),
      },
    },
    indicator: indicator === undefined ? disclosure.indicator : indicator,
  };
}
