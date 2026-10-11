'use client';

import { useEffect, useId, useState, useRef, useCallback, type Ref } from 'react';

import { useMergedRefs } from './useMergedRefs';

const DEFAULT_EMPTY_MESSAGE = 'Поле обязательно для заполнения';

export interface FieldControlConfig {
    id?: string;
    value?: string | number | readonly string[];
    /** Начальное значение локального черновика неуправляемого поля. */
    defaultValue?: string | number | readonly string[];
    required?: boolean;
    emptyMessage?: string;
    error?: string;
    validate?: (value: string) => string | undefined;
    isEmpty?: (value: string) => boolean;
    /** Сброс локальной маски при нативном form.reset(); не вызывает onChange. */
    onReset?: () => void;
}

export function useFieldControl<E extends HTMLElement>(
    ref: Ref<E | null> | undefined,
    config: FieldControlConfig
) {
    const {
        id: idProp,
        value: valueProp,
        defaultValue,
        required,
        emptyMessage = DEFAULT_EMPTY_MESSAGE,
        error: errorProp,
        validate: validateProp,
        isEmpty: isEmptyProp,
        onReset,
    } = config;

    const generatedId = useId();
    const id = idProp ?? generatedId;

    const innerRef = useRef<E>(null);
    const fieldRef = useMergedRefs(innerRef, ref);

    const isControlled = valueProp !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue ?? ''));
    const currentValue = isControlled ? String(valueProp) : uncontrolledValue;

    const [internalError, setInternalError] = useState<string | undefined>(undefined);
    const displayError = errorProp ?? internalError;
    const errorId = displayError ? `${id}-error` : undefined;

    // Ассоциация может поменяться через form= или при смене skeleton → field.
    useEffect(() => {
        const field = innerRef.current;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        const form = field.form;
        if (!form) return;
        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (event.defaultPrevented || innerRef.current !== field || field.form !== form) return;
                if (!isControlled) setUncontrolledValue(String(defaultValue ?? ''));
                setInternalError(undefined);
                onReset?.();
            });
        };
        form.addEventListener('reset', reset);
        return () => form.removeEventListener('reset', reset);
    });

    const isEmpty = useCallback(
        (value: string) => isEmptyProp ? isEmptyProp(value) : !value.trim(),
        [isEmptyProp]
    );

    const validateValue = useCallback(
        (value: string): string | undefined => {
            if (required && isEmpty(value)) return emptyMessage;
            return validateProp?.(value);
        },
        [required, emptyMessage, isEmpty, validateProp]
    );

    const focusField = useCallback(() => {
        innerRef.current?.focus();
    }, []);

    const hasValue = currentValue.length > 0;

    return {
        id,
        innerRef,
        fieldRef,
        isControlled,
        currentValue,
        hasValue,
        setUncontrolledValue,
        displayError,
        errorId,
        isEmpty,
        validateValue,
        setInternalError,
        focusField,
    };
}
