'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  Ref,
  RefCallback,
  RefObject,
} from 'react';
import type { FieldValueChangeHandler, FieldValueChangeReason } from '../../core';
import { useMergedRefs } from '../../core';
import { resolveSeedField } from '../../core/base/seed';
import { UI_MESSAGES } from '../../core/base/messages';
import { useFormReset } from '../../core/useFormReset';
import { scheduleCaretRestore } from '../../core/base/restore-caret';
import { checkFieldValue } from '../../core/fields/policy';
import type { FieldEdit, FieldPolicy, FieldValidationPhase } from '../../core/fields/policy';

type NativeTextField = HTMLInputElement | HTMLTextAreaElement;

type FieldValue = InputHTMLAttributes<HTMLInputElement>['value'];
type FieldDefaultValue = InputHTMLAttributes<HTMLInputElement>['defaultValue'];

type FieldCommit<E extends NativeTextField> = {
  value: string;
  reason: Exclude<FieldValueChangeReason, 'country'>;
  event?: ChangeEvent<E> | FocusEvent<E> | null;
  validation?: FieldValidationPhase;
  edit?: FieldEdit;
};

interface NativeFieldBinding {
  key: string;
  binding: FieldPolicy['value']['binding'];
  node: NativeTextField | null;
  controlled: boolean;
}

export function restoreNativeDraftAfterBindingChange(
  previous: NativeFieldBinding | null,
  current: NativeFieldBinding,
  value: string,
): void {
  const changed =
    !previous ||
    previous.key !== current.key ||
    previous.binding !== current.binding ||
    previous.node !== current.node ||
    previous.controlled !== current.controlled;

  if (!changed || current.controlled || current.binding !== 'native' || !current.node) return;
  if (current.node.value !== value) current.node.value = value;
}

export interface FieldOptions<E extends NativeTextField = HTMLInputElement> {
  policy: FieldPolicy;
  ref?: Ref<E>;
  id?: string;
  value?: FieldValue;
  defaultValue?: FieldDefaultValue;
  inputProps?: InputHTMLAttributes<E>;
  required?: boolean;
  emptyMessage?: string;
  error?: string;
  validate?: (value: string) => string | undefined;
  seed?: string;
  lockAutofill?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (event: ChangeEvent<E>) => void;
  onValueChange?: FieldValueChangeHandler<E>;
  onFocus?: (event: FocusEvent<E>) => void;
  onBlur?: (event: FocusEvent<E>) => void;
  onKeyDown?: (event: KeyboardEvent<E>) => void;
  onInvalid?: (event: FormEvent<E>) => void;
}

export interface FieldController<E extends NativeTextField = HTMLInputElement> {
  id: string;
  value: {
    current: string;
    display: string;
    hasValue: boolean;
    edit(event: ChangeEvent<E>): boolean;
    finish(event: FocusEvent<E>): void;
    pick(value: string): void;
    step(delta: number): void;
    reset(): void;
  };
  validation: {
    check(value?: string, phase?: FieldValidationPhase): string | undefined;
    message?: string;
  };
  control: {
    props: InputHTMLAttributes<E>;
    target: RefObject<E | null>;
    ref: RefCallback<E>;
  };
  focus: {
    active: boolean;
    request(): void;
    enter(event: FocusEvent<E>): void;
    leave(inside: boolean): void;
  };
  events: {
    onChange(event: ChangeEvent<E>): void;
    onFocus(event: FocusEvent<E>): void;
    onBlur(event: FocusEvent<E>): void;
    onKeyDown(event: KeyboardEvent<E>): void;
    onInvalid(event: FormEvent<E>): void;
  };
  seed: { active: boolean };
  autofill: { locked: boolean };
  resetKey: number;
}

/** Owns a field's draft channels, native event order, validation, seed, and reset lifecycle. */
export function useField<E extends NativeTextField = HTMLInputElement>(
  options: FieldOptions<E>,
): FieldController<E> {
  const {
    policy,
    ref: externalRef,
    id: idProp,
    value: valueProp,
    defaultValue,
    inputProps = {},
    required = false,
    emptyMessage = UI_MESSAGES.validation.required,
    error: errorProp,
    validate,
    seed,
    lockAutofill = false,
    disabled = false,
    readOnly: readOnlyProp,
    onChange,
    onValueChange,
    onFocus,
    onBlur,
    onKeyDown,
    onInvalid,
  } = options;
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const target = useRef<E | null>(null);
  const mergedRef = useMergedRefs(target, externalRef);
  const controlled = valueProp !== undefined;
  const readOnly = readOnlyProp ?? Boolean(inputProps.readOnly);
  const initialValue =
    defaultValue === undefined ? policy.initial() : policy.value.normalize(String(defaultValue));
  const [drafts, setDrafts] = useState<Record<string, string>>(() => ({
    [policy.value.draftKey]: initialValue,
  }));
  const [internalError, setInternalError] = useState<string | undefined>();
  const [active, setActive] = useState(false);
  const [autofillLocked, setAutofillLocked] = useState(lockAutofill && !readOnly);
  const [resetKey, setResetKey] = useState(0);
  const pendingCaret = useRef<(() => void) | null>(null);
  const lastBinding = useRef<NativeFieldBinding | null>(null);
  const currentInput = controlled
    ? policy.value.normalize(valueProp == null ? '' : String(valueProp))
    : policy.value.normalize(drafts[policy.value.draftKey] ?? policy.initial());
  const seedEnabled = policy.value.supportsSeed && Boolean(seed) && !readOnly;
  const seedState = resolveSeedField({
    seed: seedEnabled ? seed : undefined,
    value: currentInput,
    placeholder: inputProps.placeholder,
  });
  const displayValue = policy.value.display(currentInput);
  const renderedValue = seedEnabled ? seedState.displayValue : displayValue;
  const displayError = errorProp ?? internalError;

  useLayoutEffect(() => {
    const currentBinding: NativeFieldBinding = {
      key: policy.value.draftKey,
      binding: policy.value.binding,
      node: target.current,
      controlled,
    };
    restoreNativeDraftAfterBindingChange(lastBinding.current, currentBinding, currentInput);
    lastBinding.current = currentBinding;
  });

  const store = useCallback(
    (next: string, draftKey = policy.value.draftKey) => {
      if (controlled) return;
      setDrafts((current) =>
        current[draftKey] === next ? current : { ...current, [draftKey]: next });
    },
    [controlled, policy.value.draftKey],
  );

  const check = useCallback(
    (nextValue = currentInput, phase: FieldValidationPhase = 'commit') => {
      const message = checkFieldValue({
        policy,
        value: nextValue,
        required,
        readOnly,
        emptyMessage,
        validate,
      });

      if (phase === 'editing') {
        setInternalError((current) => (current ? message : undefined));
      } else {
        setInternalError(message);
      }
      return message;
    },
    [currentInput, emptyMessage, policy, readOnly, required, validate],
  );

  const cancelCaret = useCallback(() => {
    pendingCaret.current?.();
    pendingCaret.current = null;
  }, []);

  useEffect(() => cancelCaret, [cancelCaret]);
  useEffect(() => {
    setAutofillLocked(lockAutofill && !readOnly);
  }, [lockAutofill, readOnly]);

  const writeDisplay = useCallback(
    (value: string, input: E | null) => {
      if (controlled || !input) return;
      input.value = value;
    },
    [controlled],
  );

  const commit = useCallback(
    ({ value: next, reason, event = null, validation: phase, edit }: FieldCommit<E>) => {
      const checkBeforeNotify = reason !== 'pick' && phase && policy.validation.beforeNotify;
      if (reason === 'pick') check(next, 'commit');
      else if (checkBeforeNotify) check(next, phase);

      if (
        edit?.displayValue !== undefined &&
        edit.writeDisplay &&
        event &&
        (reason !== 'seed' || !controlled)
      ) {
        event.currentTarget.value = edit.displayValue;
      } else if (reason === 'step') {
        writeDisplay(edit?.displayValue ?? policy.value.display(next), target.current);
      }

      const changed = next !== currentInput;
      if (reason !== 'format' || changed) {
        store(next);
        onValueChange?.(next, { reason, event: reason === 'pick' ? null : event });
      }
      if (reason !== 'pick' && phase && !checkBeforeNotify) check(next, phase);
    },
    [
      check,
      controlled,
      currentInput,
      policy.validation.beforeNotify,
      policy.value,
      onValueChange,
      store,
      writeDisplay,
    ],
  );

  const finish = useCallback(
    (event: FocusEvent<E>) => {
      if (readOnly) {
        check(event.currentTarget.value, 'commit');
        return;
      }
      const raw = event.currentTarget.value;
      const edit = policy.value.finish(raw);
      const next = edit?.value ?? policy.value.normalize(raw);
      commit({ value: next, reason: 'format', event, validation: 'commit', edit: edit ?? undefined });
    },
    [check, commit, policy.value, readOnly],
  );

  const applyEdit = useCallback(
    (
      raw: string,
      event: ChangeEvent<E>,
      start: number | null,
      end: number | null,
      direction: E['selectionDirection'],
    ) => {
      if (readOnly || disabled) return false;
      const result = policy.value.edit(raw, start, end);
      if (!result) return false;
      const next = result;
      const phase = next.validation ?? (policy.validation.whileEditing ? 'editing' : 'commit');
      commit({ value: next.value, reason: 'input', event, validation: phase, edit: next });

      if (
        result?.selectionStart != null &&
        result.selectionEnd != null &&
        result.displayValue !== undefined
      ) {
        cancelCaret();
        const input = event.currentTarget;
        pendingCaret.current = scheduleCaretRestore(
          {
            input,
            displayValue: result.displayValue,
            selectionStart: result.selectionStart,
            selectionEnd: result.selectionEnd,
            direction,
          },
          () => target.current === input,
        );
      }
      return true;
    },
    [cancelCaret, commit, disabled, policy.validation.whileEditing, policy.value, readOnly],
  );

  const edit = useCallback(
    (event: ChangeEvent<E>) => {
      const raw = event.currentTarget.value;
      const start = event.currentTarget.selectionStart;
      const end = event.currentTarget.selectionEnd;
      const direction = event.currentTarget.selectionDirection;
      return applyEdit(raw, event, start, end, direction);
    },
    [applyEdit],
  );

  const pick = useCallback(
    (value: string) => {
      if (disabled || readOnly) return;
      const next = policy.value.normalize(value);
      commit({ value: next, reason: 'pick', validation: 'commit' });
    },
    [commit, disabled, policy.value, readOnly],
  );

  const step = useCallback(
    (delta: number) => {
      const calculate = policy.value.step;
      if (!calculate || disabled || readOnly) return;
      const input = target.current;
      const view = input?.ownerDocument.defaultView;
      const numericInput = view && input instanceof view.HTMLInputElement ? input : null;
      const edit = calculate(currentInput, delta, numericInput);
      if (!edit) return;
      commit({ value: edit.value, reason: 'step', validation: 'commit', edit });
    },
    [commit, currentInput, disabled, policy.value.step, readOnly],
  );

  const reset = useCallback(() => {
    if (!controlled) {
      const next =
        defaultValue === undefined
          ? policy.initial()
          : policy.value.normalize(String(defaultValue));
      store(next);
    }
    setInternalError(undefined);
    setResetKey((current) => current + 1);
  }, [controlled, defaultValue, policy, store]);

  const enter = useCallback(
    (event: FocusEvent<E>) => {
      setActive(true);
      if (lockAutofill && !readOnly && autofillLocked) {
        setAutofillLocked(false);
        event.currentTarget.removeAttribute('readonly');
      }

      if (seedEnabled && seedState.focusValue !== undefined) {
        const next = seedState.focusValue;
        const display = resolveSeedField({ seed, value: next }).displayValue;
        const edit: FieldEdit = { value: next, displayValue: display, writeDisplay: true };
        commit({ value: next, reason: 'seed', event, edit });
      }
      onFocus?.(event);
    },
    [
      autofillLocked,
      lockAutofill,
      onFocus,
      readOnly,
      seed,
      seedEnabled,
      seedState.focusValue,
      commit,
    ],
  );

  const leave = useCallback(
    (inside: boolean) => {
      if (inside) return;
      setActive(false);
      if (lockAutofill && !readOnly) setAutofillLocked(true);
    },
    [lockAutofill, readOnly],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<E>) => {
      if (policy.blur === 'control') {
        if (seedEnabled && seedState.blurValue !== undefined) {
          const next = seedState.blurValue;
          const display = resolveSeedField({ seed, value: next }).displayValue;
          commit({
            value: next,
            reason: 'seed',
            event,
            edit: { value: next, displayValue: display, writeDisplay: true },
          });
          check(next, 'commit');
        } else {
          finish(event);
        }
      }
      onBlur?.(event);
    },
    [check, commit, finish, onBlur, policy.blur, seed, seedEnabled, seedState.blurValue],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<E>) => {
      if (readOnly || disabled) return;
      const raw = event.currentTarget.value;
      const start = event.currentTarget.selectionStart;
      const end = event.currentTarget.selectionEnd;
      const direction = event.currentTarget.selectionDirection;
      onChange?.(event);
      applyEdit(raw, event, start, end, direction);
    },
    [applyEdit, disabled, onChange, readOnly],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<E>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled || !policy.keyboard) return;
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !policy.keyboard.allowsKey(event.key)
      ) {
        event.preventDefault();
      }
    },
    [disabled, onKeyDown, policy.keyboard],
  );

  const handleInvalid = useCallback(
    (event: FormEvent<E>) => {
      onInvalid?.(event);
      if (!event.defaultPrevented) event.preventDefault();
    },
    [onInvalid],
  );

  useFormReset(target, undefined, reset);

  const controlProps: InputHTMLAttributes<E> = {
    ...inputProps,
    id,
    value: controlled || policy.value.binding === 'model' ? renderedValue : undefined,
    defaultValue: controlled || policy.value.binding === 'model' ? undefined : defaultValue,
    placeholder: seedEnabled ? seedState.placeholder : inputProps.placeholder,
    disabled,
    readOnly: readOnly || (lockAutofill && autofillLocked),
    required: required && !readOnly,
    'aria-required': required || undefined,
    autoComplete: inputProps.autoComplete ?? 'off',
    'aria-invalid': inputProps['aria-invalid'] ?? (displayError ? true : undefined),
  };

  return {
    id,
    value: {
      current: currentInput,
      display: displayValue,
      hasValue: displayValue.length > 0,
      edit,
      finish,
      pick,
      step,
      reset,
    },
    validation: { check, message: displayError },
    control: { props: controlProps, target, ref: mergedRef },
    focus: { active, request: () => target.current?.focus(), enter, leave },
    events: {
      onChange: handleChange,
      onFocus: enter,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      onInvalid: handleInvalid,
    },
    seed: { active: seedState.isHintShown },
    autofill: { locked: autofillLocked },
    resetKey,
  };
}

/** Checks whether focus remains in any field or portal region, using the event's own document. */
export function focusContains(
  event: FocusEvent<HTMLElement>,
  regions: readonly RefObject<HTMLElement | null>[],
): boolean {
  const ownerWindow = event.currentTarget.ownerDocument.defaultView;
  const relatedTarget = event.relatedTarget;
  if (!ownerWindow || !(relatedTarget instanceof ownerWindow.Node)) return false;
  return regions.some((region) => region.current?.contains(relatedTarget) ?? false);
}
