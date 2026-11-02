import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';
import type React from 'react';

import { useFieldControl } from '../../core';
import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';
import { useFormReset } from '../../core/useFormReset';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import {
  defaultEqual,
  getFocusedOptionIndex,
  resolveSelectCatalog,
  moveSelectFocus,
  type SelectItem,
  type SelectOption,
} from './options';

export interface SelectRenderValuePayload<T extends string = string> {
  selectedOption: SelectOption<T> | null;
  selectedOptions: SelectOption<T>[];
  multiple: boolean;
  placeholder: string;
  hasSelectedValue: boolean;
}

/** Значение внутри хука — общий `T | null | T[]`; тип своей ветки `multiple` наружу отдаёт Select. */
export interface SelectConfig<T extends string> extends SharedMotionProps {
  options: readonly SelectItem<T>[];
  value?: T | null | T[];
  defaultValue?: T | null | T[];
  onChange: (value: T | null | T[]) => void;
  multiple: boolean;
  closeOnSelect: boolean;
  showSelected: boolean;
  renderValue?: (payload: SelectRenderValuePayload<T>) => React.ReactNode;
  placeholder: string;
  loading: boolean;
  disabled?: boolean;
  required?: boolean;
  emptyMessage: string;
  visibleOptions: number;
  validate: (value: T | null | T[]) => string | undefined;
  id?: string;
  form?: string;
  error?: string;
  label?: string;
  comment?: string;
  ariaLabel?: string;
}

/** Поведение Select: значение, раскрытие, пункт в фокусе, клавиатура, проверка. Вид — в Select.tsx. */
export function useSelect<T extends string>(
  ref: Ref<HTMLDivElement> | undefined,
  config: SelectConfig<T>,
) {
  const {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    multiple,
    closeOnSelect,
    showSelected,
    renderValue,
    placeholder,
    loading,
    disabled,
    required,
    emptyMessage,
    visibleOptions,
    validate: validateProp,
    id: idProp,
    error: errorProp,
    label,
    comment,
    ariaLabel,
    perspective3d,
    parallax,
    animate,
  } = config;

  const [uncontrolledValue, setUncontrolledValue] = useState<T | null | T[]>(
    defaultValue ?? (multiple ? [] : null),
  );

  const value = valueProp !== undefined ? valueProp : uncontrolledValue;

  const catalog = useMemo(
    () => resolveSelectCatalog({ options, value, multiple, showSelected }),
    [options, value, multiple, showSelected],
  );
  const {
    selectedOption,
    selectedOptions,
    options: dropdownOptions,
    items: dropdownItems,
    many: valueArray,
    single: valueSingle,
    hasValue: hasSelectedValue,
  } = catalog;

  const defaultDisplayContent = hasSelectedValue
    ? multiple
      ? formatUiMessage(UI_MESSAGES.select.selectedCount, { count: selectedOptions.length })
      : (selectedOption?.selectedChildren ?? selectedOption?.children ?? selectedOption?.label)
    : placeholder;

  const displayContent = renderValue
    ? renderValue({
        selectedOption,
        selectedOptions,
        multiple,
        placeholder,
        hasSelectedValue,
      })
    : defaultDisplayContent;

  const { id, innerRef, fieldRef, displayError, errorId, setInternalError, focusField } =
    useFieldControl<HTMLDivElement>(ref, {
      id: idProp,
      error: errorProp,
    });

  const listboxId = `${id}-listbox`;
  const commentId = !displayError && comment ? `${id}-comment` : undefined;
  const helperTextId = displayError ? errorId : commentId;

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  useFormReset(innerRef, config.form, () => {
    if (valueProp === undefined) setUncontrolledValue(defaultValue ?? (multiple ? [] : null));
    setInternalError(undefined);
    setOpen(false);
    setFocusedIndex(-1);
  });
  const showInlineError = Boolean(displayError) && !open;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLElement | null>>([]);

  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
    animate,
  });

  const normalizedVisibleOptions = Math.max(1, Math.floor(visibleOptions));
  // Прокрутка нужна, только если строк БОЛЬШЕ, чем помещается в окно списка. Без этого
  // условия `scrollbar-gutter: stable` резервировал полосу всегда — у списка из одной строки
  // справа зияла пустая колонка, которую читают как «тут что-то прокручивается».
  const dropdownScrolls = dropdownItems.length > normalizedVisibleOptions;

  const triggerAccessibilityProps = {
    'aria-label': ariaLabel ?? label ?? placeholder,
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': open,
    'aria-controls': listboxId,
    'aria-describedby': helperTextId,
    'aria-invalid': !!displayError,
    'aria-disabled': disabled || undefined,
    'aria-required': required || undefined,
  };

  const validateValue = useCallback(
    (v: T | null | T[]): string | undefined => {
      if (required) {
        if (multiple) {
          if (!Array.isArray(v) || v.length === 0) return emptyMessage;
        } else if (v == null || (typeof v === 'string' && !v.trim())) {
          return emptyMessage;
        }
      }

      return validateProp(v);
    },
    [required, emptyMessage, validateProp, multiple],
  );

  const openDropdown = useCallback(() => {
    // `loading` держит список закрытым: варианты ещё едут, и раскрытый пустой список
    // человек прочитает как «выбирать не из чего», а не как «подожди».
    if (disabled || loading || dropdownOptions.length === 0) return;

    setOpen(true);
    setFocusedIndex(
      getFocusedOptionIndex(dropdownOptions, multiple, selectedOption, selectedOptions),
    );
  }, [disabled, loading, dropdownOptions, multiple, selectedOption, selectedOptions]);

  const closeDropdown = useCallback(
    (shouldValidate = true) => {
      setOpen(false);
      setFocusedIndex(-1);

      if (shouldValidate) {
        setInternalError(validateValue(value));
      }
    },
    [setInternalError, validateValue, value],
  );

  const commitValue = useCallback(
    (nextValue: T | null | T[]) => {
      if (valueProp === undefined) setUncontrolledValue(nextValue);

      onChange(nextValue);
      setInternalError(validateValue(nextValue));
    },
    [onChange, setInternalError, validateValue, valueProp],
  );

  useEffect(() => {
    if (!open || focusedIndex < 0) return;

    const dropdownElement = dropdownRef.current;
    const optionElement = optionRefs.current[focusedIndex];

    if (!dropdownElement || !optionElement) return;

    const optionTop = optionElement.offsetTop;
    const optionBottom = optionTop + optionElement.offsetHeight;
    const visibleTop = dropdownElement.scrollTop;
    const visibleBottom = visibleTop + dropdownElement.clientHeight;

    if (optionTop < visibleTop) {
      dropdownElement.scrollTop = optionTop;
      return;
    }

    if (optionBottom > visibleBottom) {
      dropdownElement.scrollTop = optionBottom - dropdownElement.clientHeight;
    }
  }, [open, focusedIndex]);

  useEffect(() => {
    if (!open) return;

    if (dropdownOptions.length === 0) {
      setOpen(false);
      setFocusedIndex(-1);
      return;
    }

    setFocusedIndex((currentIndex) => {
      if (currentIndex < 0) return 0;
      return Math.min(currentIndex, dropdownOptions.length - 1);
    });
  }, [dropdownOptions.length, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        focusField();
        openDropdown();
      } else closeDropdown();
    },
    [focusField, openDropdown, closeDropdown],
  );

  const handleDropdownWheelCapture = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleDropdownTouchMoveCapture = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (disabled || loading) return;
      const optionIndex = dropdownOptions.findIndex((current) =>
        defaultEqual(current.value, option.value));
      let next: T | T[] = option.value;
      if (multiple) {
        const alreadySelected = valueArray.includes(option.value);
        next = alreadySelected
          ? valueArray.filter((value) => value !== option.value)
          : [...valueArray, option.value];
      }
      commitValue(next);

      if (!multiple || closeOnSelect) closeDropdown(false);
      else setFocusedIndex(optionIndex);
    },
    [
      closeDropdown,
      closeOnSelect,
      commitValue,
      disabled,
      dropdownOptions,
      loading,
      multiple,
      valueArray,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        closeDropdown();
        return;
      }
      if (event.key === 'Tab') {
        if (open) closeDropdown();
        return;
      }

      const chooseFocused = () => {
        const option = dropdownOptions[focusedIndex];
        if (option) handleSelect(option);
      };
      const move = (direction: 1 | -1) =>
        setFocusedIndex((current) => moveSelectFocus(current, direction, dropdownOptions.length));
      const activate = () => (open ? chooseFocused() : openDropdown());
      const commands: Record<string, (() => void) | undefined> = {
        Enter: activate,
        ' ': activate,
        ArrowDown: () => (open ? move(1) : openDropdown()),
        ArrowUp: () => (open ? move(-1) : openDropdown()),
        Home: () => (open ? setFocusedIndex(0) : openDropdown()),
        End: open ? () => setFocusedIndex(dropdownOptions.length - 1) : undefined,
      };
      const command = commands[event.key];
      if (!command) return;
      event.preventDefault();
      command();
    },
    [closeDropdown, disabled, dropdownOptions, focusedIndex, handleSelect, open, openDropdown],
  );

  const optionIndexOf = (option: SelectOption<T>) =>
    dropdownOptions.findIndex((currentOption) => defaultEqual(currentOption.value, option.value));

  const isOptionSelected = (option: SelectOption<T>) =>
    multiple
      ? (valueArray?.includes(option.value) ?? false)
      : defaultEqual(option.value, valueSingle);

  const setOptionRef = (index: number) => (element: HTMLElement | null) => {
    optionRefs.current[index] = element;
  };

  return {
    id,
    value: {
      current: value,
      content: displayContent,
      hasValue: hasSelectedValue,
      selectedOption,
      selectedOptions,
      isSelected: isOptionSelected,
      select: handleSelect,
    },
    feedback: { error: displayError, errorId, commentId, inline: showInlineError },
    popup: {
      open,
      change: handleOpenChange,
      close: closeDropdown,
      items: dropdownItems,
      options: dropdownOptions,
      ref: dropdownRef,
      scrolls: dropdownScrolls,
      visibleOptions: normalizedVisibleOptions,
      id: listboxId,
      events: {
        onWheelCapture: handleDropdownWheelCapture,
        onTouchMoveCapture: handleDropdownTouchMoveCapture,
      },
    },
    focus: { index: focusedIndex, set: setFocusedIndex, ref: setOptionRef, indexOf: optionIndexOf },
    trigger: { ref: fieldRef, accessibility: triggerAccessibilityProps, onKeyDown: handleKeyDown },
    motion: {
      ref: setMotionNode,
      handlers: motionHandlers,
      style: motionStyle,
      attrs: revealAttrs,
    },
  };
}

export type SelectController<T extends string> = ReturnType<typeof useSelect<T>>;
