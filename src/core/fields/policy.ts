export type FieldValidationPhase = 'editing' | 'commit';
export type FieldBinding = 'native' | 'model';

export interface FieldEdit {
  value: string;
  displayValue?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  validation?: FieldValidationPhase;
  writeDisplay?: boolean;
}

/** Pure value and validation behavior supplied by a field mode. */
export interface FieldPolicy {
  initial(): string;
  value: {
    draftKey: string;
    binding: FieldBinding;
    supportsSeed: boolean;
    normalize(value: string): string;
    display(value: string): string;
    isEmpty(value: string): boolean;
    edit(raw: string, selectionStart: number | null, selectionEnd: number | null): FieldEdit | null;
    finish(value: string): FieldEdit | null;
    step?(value: string, delta: number, input: HTMLInputElement | null): FieldEdit | null;
  };
  validation: {
    whileEditing: boolean;
    /** Preserve validation before the public model callback when required by the field contract. */
    beforeNotify?: boolean;
    check(value: string, validate?: (value: string) => string | undefined): string | undefined;
  };
  blur: 'scope' | 'control';
  keyboard?: { allowsKey(key: string): boolean };
}

export function checkFieldValue(options: {
  policy: FieldPolicy;
  value: string;
  required: boolean;
  readOnly: boolean;
  emptyMessage: string;
  validate?: (value: string) => string | undefined;
}): string | undefined {
  const { policy, value, required, readOnly, emptyMessage, validate } = options;
  if (required && !readOnly && policy.value.isEmpty(value)) return emptyMessage;
  return policy.validation.check(value, validate);
}
