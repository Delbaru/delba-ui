import { composeEventHandlers } from '../../core/composeEventHandlers';

export function composeDropdownTriggerClick<E extends { defaultPrevented: boolean }>(
  onClick: ((event: E) => void) | undefined,
  disabled: boolean | undefined,
  toggle: () => void,
): (event: E) => void {
  return composeEventHandlers(onClick, () => {
    if (!disabled) toggle();
  }, { cancelable: true });
}
