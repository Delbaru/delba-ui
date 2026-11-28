import { changeSelectionKeys } from '../Collection/Selection';

export function disclosureKeys(value: string | null | readonly string[] | undefined): readonly string[] {
  if (value == null) return [];
  return typeof value === 'string' ? [value] : value;
}

export function nextDisclosureKeys(
  current: readonly string[],
  key: string,
  intent: 'toggle' | 'reveal',
  { multiple, collapsible }: { multiple?: boolean; collapsible: boolean },
): string[] | undefined {
  const open = current.includes(key);
  if (open && (intent === 'reveal' || (!multiple && !collapsible))) return undefined;

  return changeSelectionKeys(current, [key], intent === 'reveal' ? 'select' : 'toggle', multiple ? 'multiple' : 'single');
}
