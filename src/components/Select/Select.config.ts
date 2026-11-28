import { UI_MESSAGES } from '../../core/base/messages';

export const selectDefaults = {
  placeholder: UI_MESSAGES.select.placeholder,
  emptyMessage: UI_MESSAGES.select.required,
  visibleOptions: 4,
};

export const selectPanelVariables = [
  '--select-height',
  '--select-dropdown-radius',
  '--select-dropdown-radius-top',
  '--select-option-padding',
  '--select-panel-border',
] as const;
