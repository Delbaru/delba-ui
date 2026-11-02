import { EMAIL_PATTERN, EMAIL_REGEX } from '../../validation';
import { UI_MESSAGES } from '../../core/base/messages';
import type { FieldPolicy } from '../../core/fields/policy';
import {
  DEFAULT_PHONE_FORMAT,
  emptyValue,
  formatPhone,
  isEmpty as isPhoneEmpty,
  maxLengthOf as phoneMaxLength,
  normalizePhoneInput,
  placeholderText as phonePlaceholder,
  stripPrefix,
  validate as validatePhone,
} from '../../core/fields/phone';
import {
  normalizeConstraintValue,
  validateDateBounds,
  validateTimeBounds,
} from './formats/constraints';
import * as dateFormat from '../../core/fields/date';
import {
  calculateNumberStep,
  isNumberCharacterAllowed,
  normalizeNumberOptions,
} from './formats/number';
import * as timeFormat from './formats/time';
import type { PhoneFormat } from '../../core/fields/phone';

export interface InputModeOptions {
  type?: React.HTMLInputTypeAttribute;
  phoneFormat?: PhoneFormat;
  min?: string | number;
  max?: string | number;
  numberOptions?: readonly number[];
}

export interface InputModeNativeOptions {
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  length?: { min?: number; max?: number };
}

export interface InputModeDecoration {
  phone?: PhoneFormat;
  empty: boolean;
  time?: { showMask: boolean; value: string; suffix: string };
}

interface ModeDefinition {
  kind: string;
  nativeType: React.HTMLInputTypeAttribute;
  policy(options: InputModeOptions): FieldPolicy;
  locksAutofill: boolean;
  calendar?: boolean;
  errorPlacement?: 'below';
  nativeAttributes(
    value: string,
    active: boolean,
    options: InputModeNativeOptions,
    phoneFormat: PhoneFormat,
  ): React.InputHTMLAttributes<HTMLInputElement>;
  decoration(value: string, active: boolean, phoneFormat: PhoneFormat): InputModeDecoration;
}

function identity(value: string): string {
  return value;
}

function createStandardPolicy(
  draftKey: string,
  binding: 'native' | 'model' = 'native',
): FieldPolicy {
  return {
    initial: () => '',
    value: {
      draftKey,
      binding,
      supportsSeed: true,
      normalize: identity,
      display: identity,
      isEmpty: (value) => value.trim().length === 0,
      edit: (value) => ({ value }),
      finish: () => null,
    },
    validation: {
      whileEditing: true,
      check: (value, validate) => validate?.(value),
    },
    blur: 'control',
    keyboard: { allowsKey: () => true },
  };
}

function createTextPolicy(_options: InputModeOptions): FieldPolicy {
  return createStandardPolicy('native');
}

function createEmailPolicy(_options: InputModeOptions): FieldPolicy {
  const policy = createStandardPolicy('native');
  return {
    ...policy,
    validation: {
      whileEditing: true,
      check: (value, validate) => {
        if (value && !EMAIL_REGEX.test(value)) return UI_MESSAGES.validation.email;
        return validate?.(value);
      },
    },
  };
}

function createPhonePolicy(options: InputModeOptions): FieldPolicy {
  const phoneFormat = options.phoneFormat ?? DEFAULT_PHONE_FORMAT;
  return {
    initial: () => emptyValue(phoneFormat),
    value: {
      draftKey: 'phone',
      binding: 'model',
      supportsSeed: false,
      normalize: (value) => formatPhone(value, phoneFormat) || emptyValue(phoneFormat),
      display: (value) => stripPrefix(value, phoneFormat),
      isEmpty: (value) => isPhoneEmpty(value, phoneFormat),
      edit: (raw, selectionStart, selectionEnd) => {
        const edit = normalizePhoneInput(raw, selectionStart, selectionEnd, phoneFormat);
        return {
          value: edit.formatted,
          displayValue: edit.displayValue,
          selectionStart: edit.selectionStart,
          selectionEnd: edit.selectionEnd,
        };
      },
      finish: () => null,
    },
    validation: {
      whileEditing: true,
      check: (value, validate) => {
        if (value) return validatePhone(value, phoneFormat);
        return validate?.(value);
      },
    },
    blur: 'control',
    keyboard: { allowsKey: () => true },
  };
}

function createNumberPolicy(options: InputModeOptions): FieldPolicy {
  const min = options.min === undefined ? undefined : Number(options.min);
  const max = options.max === undefined ? undefined : Number(options.max);
  const numberOptions = normalizeNumberOptions(options.numberOptions);
  const standard = createStandardPolicy('native');
  return {
    ...standard,
    value: {
      ...standard.value,
      edit: (raw) => {
        if (min === undefined || !Number.isFinite(min) || min < 0 || !raw.trim().startsWith('-')) {
          return { value: raw };
        }

        const stripped = raw.replace(/^-+/, '');
        const value = stripped === '-' ? '' : stripped;
        return { value, displayValue: value, validation: 'commit', writeDisplay: true };
      },
      step: (value, delta, input) => {
        const next = calculateNumberStep({
          currentValue: value,
          options: numberOptions,
          delta,
          min,
          max,
          field: input,
        });
        if (next === undefined || String(next) === value) return null;
        const nextValue = String(next);
        return {
          value: nextValue,
          displayValue: nextValue,
          validation: 'commit',
          writeDisplay: true,
        };
      },
    },
    validation: {
      whileEditing: true,
      check: (value, validate) => validate?.(value),
    },
    keyboard: { allowsKey: (key) => isNumberCharacterAllowed(key, min) },
  };
}

function createDatePolicy(options: InputModeOptions): FieldPolicy {
  const min = normalizeConstraintValue(options.min);
  const max = normalizeConstraintValue(options.max);
  const standard = createStandardPolicy('date', 'model');
  return {
    ...standard,
    value: {
      ...standard.value,
      supportsSeed: false,
      edit: () => null,
      normalize: dateFormat.normalizeDisplayValue,
      finish: (value) => {
        const normalized = dateFormat.normalizeDisplayValue(value);
        return normalized === value
          ? null
          : {
              value: normalized,
              displayValue: normalized,
              validation: 'commit',
              writeDisplay: true,
            };
      },
    },
    validation: {
      whileEditing: false,
      check: (value, validate) =>
        dateFormat.validate(value) ?? validateDateBounds(value, min, max) ?? validate?.(value),
    },
    blur: 'scope',
  };
}

function createTimePolicy(options: InputModeOptions): FieldPolicy {
  const min = normalizeConstraintValue(options.min);
  const max = normalizeConstraintValue(options.max);
  const standard = createStandardPolicy('time', 'model');
  return {
    ...standard,
    value: {
      ...standard.value,
      supportsSeed: false,
      normalize: timeFormat.normalize,
      edit: (raw, selectionStart, selectionEnd) => {
        const edit = timeFormat.normalizeEdit(raw, selectionStart, selectionEnd);
        return {
          value: edit.value,
          displayValue: edit.value,
          selectionStart: edit.selectionStart,
          selectionEnd: edit.selectionEnd,
          validation: 'commit',
          writeDisplay: false,
        };
      },
      finish: () => null,
    },
    validation: {
      whileEditing: false,
      check: (value, validate) =>
        timeFormat.validate(value) ?? validateTimeBounds(value, min, max) ?? validate?.(value),
    },
    blur: 'control',
    keyboard: { allowsKey: () => true },
  };
}

function basicNativeAttributes(
  type: React.HTMLInputTypeAttribute,
  options: InputModeNativeOptions,
): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    type,
    inputMode: options.inputMode,
    minLength: options.length?.min ?? options.minLength,
    maxLength: options.length?.max ?? options.maxLength,
  };
}

const nativeModeDefinitions = {
  text: {
    kind: 'text',
    nativeType: 'text',
    policy: createTextPolicy,
    locksAutofill: true,
    nativeAttributes: (_value, _active, options) => basicNativeAttributes('text', options),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  search: {
    kind: 'text',
    nativeType: 'search',
    policy: createTextPolicy,
    locksAutofill: true,
    nativeAttributes: (_value, _active, options) => basicNativeAttributes('search', options),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  email: {
    kind: 'email',
    nativeType: 'text',
    policy: createEmailPolicy,
    locksAutofill: true,
    nativeAttributes: (_value, _active, options) => ({
      ...basicNativeAttributes('text', options),
      inputMode: 'email',
      pattern: options.pattern ?? EMAIL_PATTERN,
    }),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  tel: {
    kind: 'phone',
    nativeType: 'text',
    policy: createPhonePolicy,
    locksAutofill: true,
    errorPlacement: 'below',
    nativeAttributes: (_value, _active, options, phoneFormat) => ({
      ...basicNativeAttributes('text', options),
      inputMode: 'tel',
      placeholder: options.placeholder ?? phonePlaceholder(phoneFormat),
      maxLength: options.length?.max ?? phoneMaxLength(phoneFormat),
    }),
    decoration: (value, _active, phoneFormat) => ({
      phone: phoneFormat,
      empty: isPhoneEmpty(value, phoneFormat),
    }),
  },
  number: {
    kind: 'number',
    nativeType: 'number',
    policy: createNumberPolicy,
    locksAutofill: false,
    nativeAttributes: (_value, _active, options) => basicNativeAttributes('number', options),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  date: {
    kind: 'date',
    nativeType: 'text',
    policy: createDatePolicy,
    locksAutofill: false,
    calendar: true,
    nativeAttributes: (_value, _active, options) => ({
      ...basicNativeAttributes('text', options),
      readOnly: true,
      maxLength: dateFormat.maxLength,
    }),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  data: {
    kind: 'date',
    nativeType: 'text',
    policy: createDatePolicy,
    locksAutofill: false,
    calendar: true,
    nativeAttributes: (_value, _active, options) => ({
      ...basicNativeAttributes('text', options),
      readOnly: true,
      maxLength: dateFormat.maxLength,
    }),
    decoration: (value) => ({ empty: value.length === 0 }),
  },
  time: {
    kind: 'time',
    nativeType: 'text',
    policy: createTimePolicy,
    locksAutofill: false,
    nativeAttributes: (value, active, options) => ({
      ...basicNativeAttributes('text', options),
      inputMode: 'numeric',
      placeholder: active || Boolean(value) ? '' : (options.placeholder ?? timeFormat.placeholder),
      minLength: 5,
      maxLength: timeFormat.maxLength,
    }),
    decoration: (value, active) => {
      const showMask = active || Boolean(value);
      return {
        empty: value.length === 0,
        time: {
          showMask,
          value,
          suffix: showMask ? timeFormat.getMaskSuffix(value) : '',
        },
      };
    },
  },
} as const satisfies Record<string, ModeDefinition>;

export type InputModeKind =
  (typeof nativeModeDefinitions)[keyof typeof nativeModeDefinitions]['kind'];
const unknownModeDefinition = {
  ...nativeModeDefinitions.text,
  locksAutofill: false,
} as const;

export interface ResolvedInputMode {
  kind: InputModeKind;
  inputType: React.HTMLInputTypeAttribute;
  domInputType: React.HTMLInputTypeAttribute;
  locksAutofill: boolean;
  policy: FieldPolicy;
  nativeAttributes(
    value: string,
    active: boolean,
    options: InputModeNativeOptions,
  ): React.InputHTMLAttributes<HTMLInputElement>;
  decoration(value: string, active: boolean): InputModeDecoration;
  calendar: boolean;
  errorPlacement?: 'below';
  constraints: { min?: string; max?: string; minNumber?: number; maxNumber?: number };
}

function resolve(input: InputModeOptions = {}): ResolvedInputMode {
  const inputType = input.type ?? 'text';
  const phoneFormat = input.phoneFormat ?? DEFAULT_PHONE_FORMAT;
  const isRegistered = Object.prototype.hasOwnProperty.call(nativeModeDefinitions, inputType);
  const definition = isRegistered
    ? nativeModeDefinitions[inputType as keyof typeof nativeModeDefinitions]
    : unknownModeDefinition;
  const policy = definition.policy(input);
  const min = normalizeConstraintValue(input.min);
  const max = normalizeConstraintValue(input.max);
  const minNumber = input.min === undefined ? undefined : Number(input.min);
  const maxNumber = input.max === undefined ? undefined : Number(input.max);

  return {
    kind: definition.kind,
    inputType,
    domInputType: isRegistered ? definition.nativeType : inputType,
    locksAutofill: definition.locksAutofill,
    policy,
    nativeAttributes: (value, active, options) =>
      definition.nativeAttributes(value, active, options, phoneFormat),
    decoration: (value, active) => definition.decoration(value, active, phoneFormat),
    calendar: 'calendar' in definition ? definition.calendar : false,
    errorPlacement: 'errorPlacement' in definition ? definition.errorPlacement : undefined,
    constraints: { min, max, minNumber, maxNumber },
  };
}

export const inputModes = {
  definitions: nativeModeDefinitions,
  resolve,
};
