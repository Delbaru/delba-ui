import type { FieldPolicy } from '../../core/fields/policy';
import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';
import type { TextareaProps } from './Textarea.types';

const identity = (value: string) => value;

/** Pure multiline policy; storage, seed and reset belong to Field. */
function policy(options: Pick<TextareaProps, 'length'>): FieldPolicy {
  return {
    initial: () => '',
    value: {
      draftKey: 'textarea',
      binding: 'native',
      supportsSeed: true,
      normalize: identity,
      display: identity,
      isEmpty: (value) => value.trim().length === 0,
      edit: (value) => ({ value }),
      finish: () => null,
    },
    validation: {
      whileEditing: false,
      beforeNotify: true,
      check(value, validate) {
        const { min, max } = options.length ?? {};
        if (min !== undefined && value.length > 0 && value.length < min)
          return formatUiMessage(UI_MESSAGES.textarea.minLength, { count: min });
        if (max !== undefined && value.length > max)
          return formatUiMessage(UI_MESSAGES.textarea.maxLength, { count: max });
        return validate?.(value);
      },
    },
    blur: 'control',
  };
}

export const textareaConfig = { policy, counterMaximum: 1000 };
