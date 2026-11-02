'use client';

import {
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import type React from 'react';

import { useFieldControl } from '../../../core';
import type { FieldValueChangeDetails, FieldValueChangeHandler } from '../../../core';
import { resolveSeedField } from '../../../core/base/seed';
import * as phoneMask from './phone-mask';
import * as datePicker from './date-picker';
import * as timeMask from './time-mask';
import { normalizeConstraintValue, normalizeTimeValue } from './input-constraints';
import { validateInputValue } from './input-validation';
import { useInputFocus } from './use-input-focus';
import { useInputSeed } from './use-input-seed';
import { useInputValues } from './use-input-values';
import { normalizeNumberOptions } from './number-input';
import { useInputNumber } from './use-input-number';
import { useInputPhone } from './use-input-phone';
import { useDatePicker } from './use-date-picker';

import { EMAIL_PATTERN } from '../../../validation';
export { EMAIL_REGEX } from '../../../validation';
interface UseInputBehaviorOptions {
  ref: Ref<HTMLInputElement> | undefined;
  typeProp?: React.HTMLInputTypeAttribute;
  valueProp?: React.InputHTMLAttributes<HTMLInputElement>['value'];
  defaultValueProp?: React.InputHTMLAttributes<HTMLInputElement>['defaultValue'];
  error?: string;
  idProp?: string;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: FieldValueChangeHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  required?: boolean;
  emptyMessage?: string;
  validateProp?: (value: string) => string | undefined;
  comment?: string;
  placeholder?: string;
  /** Значение по умолчанию, которое ведёт себя как подсказка (см. `resolveSeedField`). */
  seed?: string;
  length?: { min?: number; max?: number };
  numberOptions?: number[];
  phoneFormat?: phoneMask.PhoneFormat;
  restInputProps: React.InputHTMLAttributes<HTMLInputElement>;
}

export function useInputBehavior({
  ref,
  typeProp,
  valueProp,
  defaultValueProp,
  error,
  idProp,
  disabled,
  onChange,
  onValueChange,
  onFocus,
  onBlur,
  onInputKeyDown,
  required,
  emptyMessage,
  validateProp,
  comment,
  placeholder,
  seed,
  length,
  numberOptions,
  phoneFormat = phoneMask.DEFAULT_PHONE_FORMAT,
  restInputProps,
}: UseInputBehaviorOptions) {
  const inputType = typeProp ?? 'text';
  // Только для чтения ПО ЗАМЫСЛУ call-site. Вычисленный ниже `readOnly` для этого не годится:
  // он бывает true и у даты, и у анти-автозаполнения — там поле обычное, просто заперто на миг.
  const isReadOnly = Boolean(restInputProps.readOnly);
  const isPhone = inputType === 'tel';
  const isTime = inputType === 'time';
  const isDate = inputType === 'data' || inputType === 'date';
  const isNumber = inputType === 'number';
  const isEmail = inputType === 'email';
  // «Жёсткое» подавление автозаполнения приёмом «readonly до фокуса» включаем ТОЛЬКО там, где
  // разработчик явно попросил autoComplete='off' (формы входа с autoComplete='email' и т.п. при
  // этом сохраняют автозаполнение). Пока поле readonly — Chrome не показывает выпадашку; на фокусе
  // снимаем readonly. type у нас уже не семантический (text), так что autoComplete='off' + readonly
  // вместе надёжно убирают подсказки, не ломая маску (автозаполнения, с которым была гонка, больше нет).
  const lockAutofill =
    !isReadOnly &&
    (inputType === 'text' ||
      inputType === 'email' ||
      inputType === 'tel' ||
      inputType === 'search') &&
    restInputProps.autoComplete === 'off';
  const minConstraint = normalizeConstraintValue(restInputProps.min);
  const maxConstraint = normalizeConstraintValue(restInputProps.max);
  // Телефон и email рендерим нативно как text (клавиатуру держим через inputMode): нативные
  // type='tel'/'email' — сильный сигнал автозаполнения для Chrome. Само автозаполнение остаётся
  // управляемым через autoComplete: форме входа оно нужно (autoComplete='email'), а где не нужно —
  // достаточно autoComplete='off'. Наша JS-валидация завязана на проп type, а не на DOM-тип.
  const resolvedInputType = isTime || isDate || isPhone || isEmail ? 'text' : inputType;
  const defaultValueString = defaultValueProp == null ? '' : String(defaultValueProp);
  const resolvedNumberOptions = useMemo(() => {
    return normalizeNumberOptions(numberOptions);
  }, [numberOptions]);
  const {
    isPhoneControlled,
    isTimeControlled,
    isDateControlled,
    setPhoneUncontrolled,
    setTimeUncontrolled,
    setDateUncontrolled,
    phoneDisplayValue,
    phoneDisplayValueWithoutPrefix,
    timeDisplayValue,
    dateDisplayValue,
  } = useInputValues({
    isPhone,
    isTime,
    isDate,
    value: valueProp,
    defaultValue: defaultValueString,
    phoneFormat,
  });

  const typeValidate = useCallback(
    (value: string): string | undefined =>
      validateInputValue(value, {
        type: inputType,
        phoneFormat,
        min: minConstraint,
        max: maxConstraint,
        validate: validateProp,
      }),
    [inputType, maxConstraint, minConstraint, phoneFormat, validateProp],
  );

  const {
    id,
    innerRef,
    fieldRef,
    currentValue,
    displayError,
    validateValue,
    setInternalError,
    setUncontrolledValue,
    focusField,
  } = useFieldControl<HTMLInputElement>(ref, {
    id: idProp,
    value: isPhone || isTime || isDate ? undefined : valueProp,
    defaultValue: defaultValueProp,
    // Обязательность у поля только для чтения не ПРОВЕРЯЕТСЯ (звёздочку она рисует по-прежнему):
    // значение туда кладёт кто-то другой, и «Поле обязательно» на blur обвиняло бы пользователя
    // в том, чего он в этом поле сделать не может.
    required: required && !isReadOnly,
    emptyMessage,
    error,
    validate: typeValidate,
    isEmpty: isPhone ? (value: string) => phoneMask.isEmpty(value, phoneFormat) : undefined,
    onReset: () => {
      if (isPhone && !isPhoneControlled) {
        setPhoneUncontrolled(
          phoneMask.formatPhone(defaultValueString, phoneFormat) ||
            phoneMask.emptyValue(phoneFormat),
        );
      }
      if (isTime && !isTimeControlled) setTimeUncontrolled(timeMask.normalize(defaultValueString));
      if (isDate && !isDateControlled) {
        setDateUncontrolled(datePicker.normalizeDisplayValue(defaultValueString));
        deactivateDatePicker(false);
      }
    },
  });

  // `seed` — значение по умолчанию, ведущее себя как подсказка. Пока оно стоит в поле, в DOM
  // отдаётся ПУСТОЕ значение, а рисует его `::placeholder`, который браузер сам убирает по фокусу.
  // У полей с маской (телефон/дата/время) подсказкой служит сама маска, поэтому seed там не участвует.
  const helperText = displayError ?? comment;
  const helperTextColor = displayError ? 'var(--error)' : 'var(--text-muted)';

  const {
    isFocused: isFieldFocused,
    isAutofillLocked,
    focus,
    autofill,
  } = useInputFocus({ lockAutofill });

  const rootRef = useRef<HTMLElement | null>(null);

  const showTimeMask = isTime && (isFieldFocused || Boolean(timeDisplayValue));
  const timeMaskValue = isTime ? (timeDisplayValue ?? '') : '';
  const timeMaskSuffix = showTimeMask ? timeMask.getMaskSuffix(timeMaskValue) : '';

  const commitPlainValue = useCallback(
    (nextValue: string, details: FieldValueChangeDetails<HTMLInputElement>) => {
      if (valueProp === undefined) {
        setUncontrolledValue(nextValue);
        if (innerRef.current)
          innerRef.current.value = resolveSeedField({ seed, value: nextValue }).displayValue;
      }
      onValueChange?.(nextValue, details);
    },
    [innerRef, onValueChange, seed, setUncontrolledValue, valueProp],
  );

  const {
    field: seedField,
    activate: activateSeed,
    restore: restoreSeed,
  } = useInputSeed({
    seed,
    value: currentValue,
    placeholder,
    readOnly: isReadOnly,
    commitValue: commitPlainValue,
  });

  const commitDateValue = useCallback(
    (nextValue: string) => {
      if (!isDateControlled) setDateUncontrolled(nextValue);
      setInternalError(validateValue(nextValue));
      onValueChange?.(nextValue, { reason: 'pick', event: null });
    },
    [isDateControlled, onValueChange, setInternalError, validateValue],
  );

  const {
    isDatePickerActive,
    floatingRef,
    visibleMonth,
    setVisibleMonth,
    selectedDate,
    minDate,
    maxDate,
    calendarDays,
    deactivateDatePicker,
    activateDatePicker,
    toggleDatePickerActive,
    isDateDisabled,
    handleDateSelect,
  } = useDatePicker({
    enabled: isDate,
    disabled: disabled || isReadOnly,
    value: dateDisplayValue,
    minValue: minConstraint,
    maxValue: maxConstraint,
    rootRef,
    validateValue,
    setInternalError,
    focusField,
    onCommit: commitDateValue,
  });

  const isFieldActive = isFieldFocused || isDatePickerActive;
  const numberInput = useInputNumber({
    enabled: isNumber,
    disabled,
    readOnly: isReadOnly,
    min: restInputProps.min,
    max: restInputProps.max,
    options: resolvedNumberOptions,
    value: currentValue,
    valueProp,
    field: innerRef,
    setUncontrolledValue,
    onValueChange,
    setInternalError,
    validateValue,
  });
  const phoneInput = useInputPhone({
    enabled: isPhone,
    controlled: isPhoneControlled,
    format: phoneFormat,
    field: innerRef,
    setUncontrolledValue: setPhoneUncontrolled,
    onValueChange,
    onBlur,
    setInternalError,
    validateValue,
  });
  const { handleChange: handlePhoneChange, handleBlur: handlePhoneBlur } = phoneInput;
  const {
    handleChange: handleNumberChange,
    handleKeyDown: handleNumberKeyDown,
    step: handleNumberStep,
  } = numberInput;

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      focus.enter();
      autofill.unlock(event);
      activateSeed(event);
      onFocus?.(event);
    },
    [activateSeed, autofill, focus, onFocus],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const relatedTarget = event.relatedTarget as Node | null;
      const isFocusInside = Boolean(
        relatedTarget &&
          (rootRef.current?.contains(relatedTarget) ||
            floatingRef.current?.contains(relatedTarget)),
      );

      if (!isFocusInside) {
        focus.leave(false);
      }

      if (handlePhoneBlur(event)) return;

      if (isTime) {
        const nextValue = timeMask.normalize(event.target.value);
        if (!isReadOnly) {
          if (!isTimeControlled) setTimeUncontrolled(nextValue);
          if (nextValue !== timeDisplayValue)
            onValueChange?.(nextValue, { reason: 'format', event });
          setInternalError(validateValue(nextValue));
        }
        onBlur?.(event);
        return;
      }

      if (isDate) {
        if (!isFocusInside) {
          if (isDatePickerActive) deactivateDatePicker();
          else setInternalError(validateValue(dateDisplayValue ?? ''));
        }

        onBlur?.(event);
        return;
      }

      const restoredSeed = restoreSeed(event);
      if (restoredSeed !== undefined) {
        setInternalError(validateValue(restoredSeed));
        onBlur?.(event);
        return;
      }

      setInternalError(validateValue(event.target.value));
      onBlur?.(event);
    },
    [
      dateDisplayValue,
      deactivateDatePicker,
      floatingRef,
      focus,
      handlePhoneBlur,
      isDate,
      isDatePickerActive,
      isReadOnly,
      isTime,
      isTimeControlled,
      onBlur,
      onValueChange,
      rootRef,
      restoreSeed,
      setInternalError,
      timeDisplayValue,
      validateValue,
    ],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isReadOnly) return;
      const rawValue = event.target.value;
      onChange?.(event);
      if (handlePhoneChange(event)) return;

      if (isTime) {
        const { normalizedValue, selectionStart, selectionEnd } = normalizeTimeValue(
          rawValue,
          event.target.selectionStart,
          event.target.selectionEnd,
        );

        if (!isTimeControlled) setTimeUncontrolled(normalizedValue);
        onValueChange?.(normalizedValue, { reason: 'input', event });
        setInternalError(validateValue(normalizedValue));

        if (innerRef.current && selectionStart !== null && selectionEnd !== null) {
          requestAnimationFrame(() => {
            innerRef.current?.setSelectionRange(selectionStart, selectionEnd);
          });
        }

        return;
      }

      if (handleNumberChange(event)) return;

      if (isDate) {
        activateDatePicker();
        return;
      }

      if (valueProp === undefined) setUncontrolledValue(rawValue);
      onValueChange?.(rawValue, { reason: 'input', event });
      // Пока НАБИРАЮТ, ошибку только гасим, а не поднимаем — то же правило, что у телефона выше.
      // Без этого «Введите корректный email» выскакивает на первой же букве, то есть претензией
      // к незаконченному действию; поднимает ошибку blur (`handleBlur`).
      const nextError = validateValue(rawValue);
      setInternalError((currentError) => (currentError ? nextError : undefined));
    },
    [
      activateDatePicker,
      isDate,
      isReadOnly,
      isTime,
      isTimeControlled,
      onChange,
      onValueChange,
      handleNumberChange,
      handlePhoneChange,
      setInternalError,
      setUncontrolledValue,
      validateValue,
      valueProp,
    ],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      onInputKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      handleNumberKeyDown(event);
      if (event.defaultPrevented) return;

      if (!isDate) return;

      // Calendar is portaled to body, so it is outside the input's native tab order. When it is
      // open, the first Tab from the date field enters its controls instead of skipping to the
      // next page-level control. Focus leaving the calendar closes it in Calendar.
      if (isDatePickerActive && event.key === 'Tab' && !event.shiftKey) {
        const firstControl =
          floatingRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
        if (firstControl) {
          event.preventDefault();
          firstControl.focus();
          return;
        }
      }

      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        activateDatePicker();
        return;
      }

      // Escape гасит только ОТКРЫТЫЙ календарь и забирает клавишу себе: закрытый отпускает её
      // наружу — поповеру или окну, внутри которых стоит поле (как у Select).
      if (event.key === 'Escape' && isDatePickerActive) {
        event.preventDefault();
        deactivateDatePicker(false);
      }
    },
    [
      activateDatePicker,
      deactivateDatePicker,
      disabled,
      floatingRef,
      isDate,
      isDatePickerActive,
      handleNumberKeyDown,
      onInputKeyDown,
    ],
  );

  const handleInvalid = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      restInputProps.onInvalid?.(event);
      // Глушим нативный пузырёк-подсказку браузера (текст с точкой на конце генерирует сам браузер):
      // у поля своя валидация и свой вывод ошибки, дублировать нативной валидацией не нужно.
      if (!event.defaultPrevented) event.preventDefault();
    },
    [restInputProps.onInvalid],
  );

  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    ...restInputProps,
    id,
    type: resolvedInputType,
    disabled,
    // Нативный `required` в DOM не ставим: именно он заставляет браузер показывать свой
    // пузырёк-валидатор («Заполните это поле.»). Обязательность проверяем своим слоем
    // (useFieldControl → свой текст ошибки), для скринридеров оставляем aria-required.
    'aria-required': required || undefined,
    // Отключаем автоподсказки/автозаполнение браузера (сохранённые почты и т.п.) по умолчанию;
    // конкретное поле может вернуть автозаполнение, явно передав свой autoComplete.
    autoComplete: restInputProps.autoComplete ?? 'off',
    // Подавляем нативную валидацию-подсказку браузера для всех полей.
    onInvalid: handleInvalid,
    defaultValue: isPhone || isTime || isDate ? undefined : defaultValueProp,
    placeholder: isPhone
      ? (placeholder ?? phoneMask.placeholderText(phoneFormat))
      : isTime
        ? showTimeMask
          ? ''
          : (placeholder ?? timeMask.placeholder)
        : seedField.placeholder,
    'aria-invalid': restInputProps['aria-invalid'] ?? (displayError ? true : undefined),
    minLength: isTime ? 5 : (length?.min ?? restInputProps.minLength),
    maxLength: isPhone
      ? (length?.max ?? phoneMask.maxLengthOf(phoneFormat))
      : isTime
        ? timeMask.maxLength
        : isDate
          ? datePicker.maxLength
          : (length?.max ?? restInputProps.maxLength),
    inputMode: isTime ? 'numeric' : isPhone ? 'tel' : isEmail ? 'email' : restInputProps.inputMode,
    readOnly: isDate || restInputProps.readOnly || (lockAutofill && isAutofillLocked),
    value: isPhone
      ? phoneDisplayValueWithoutPrefix
      : isTime
        ? timeDisplayValue
        : isDate
          ? dateDisplayValue
          : valueProp === undefined
            ? valueProp
            : seedField.displayValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleInputKeyDown,
    ...(inputType === 'email' && { pattern: restInputProps.pattern ?? EMAIL_PATTERN }),
  };

  const handleFieldClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;

      const target = event.target as HTMLElement;
      if (target.closest('[data-input-action="true"]')) return;

      if (isDate) {
        toggleDatePickerActive();
        return;
      }

      focusField();
    },
    [disabled, focusField, isDate, toggleDatePickerActive],
  );

  const hasValue = useMemo(
    () =>
      isPhone
        ? (phoneDisplayValue ?? '').length > 0 &&
          phoneDisplayValue !== phoneMask.emptyValue(phoneFormat)
        : isTime
          ? (timeDisplayValue ?? '').length > 0
          : isDate
            ? (dateDisplayValue ?? '').length > 0
            : currentValue.length > 0,
    [
      isPhone,
      isTime,
      isDate,
      phoneDisplayValue,
      phoneFormat,
      timeDisplayValue,
      dateDisplayValue,
      currentValue,
    ],
  );

  return {
    id,
    innerRef,
    fieldRef,
    inputType,
    isPhone,
    isTime,
    isDate,
    isNumber,
    isReadOnly,
    hasError: Boolean(displayError),
    helperText,
    helperTextColor,
    rootRef,
    isFieldActive,
    hasValue,
    inputProps,
    handleFieldClick,
    handleNumberStep,
    timeField: {
      showMask: showTimeMask,
      value: timeMaskValue,
      suffix: timeMaskSuffix,
    },
    datePicker: {
      isActive: isDatePickerActive,
      floatingRef,
      visibleMonth,
      setVisibleMonth,
      selectedDate,
      minDate,
      maxDate,
      calendarDays,
      onToggle: toggleDatePickerActive,
      onDismiss: deactivateDatePicker,
      isDateDisabled,
      onDateSelect: handleDateSelect,
    },
  };
}
