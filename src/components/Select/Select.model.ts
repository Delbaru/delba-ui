'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import {
    cx,
    createLayoutClasses,
    stateProps,
    fieldHelperPaddingLeft,
    type WithRef,
    fieldLayoutClasses,
    fieldRootLayoutClasses,
    resolveFieldLayout,
    splitBoxLayout,
} from '#core';
import { useFormField } from '#core/Form';
import { useCollapseState } from '../../hooks/useCollapseState';
import { isValueArray, selectFormValues } from './options';
import { selectDefaults, selectPanelVariables } from './Select.config';
import { useSelect } from './useSelect';
import type { SelectProps } from './Select.types';
import styles from './Select.module.scss';

const classes = createLayoutClasses(styles, { local: { h: 'height' } });

export function useSelectField<T extends string>(input: WithRef<SelectProps<T>, HTMLDivElement>) {
    const props = resolvePresetProps(input, { target: 'field' });
    const geometryRef = useRef<HTMLDivElement>(null);
    const { box, rest: fieldProps } = splitBoxLayout(props);
    const {
        ref,
        className = '',
        collapse,
        fieldClassName,
        style,
        options,
        search,
        name,
        form,
        value: valueProp,
        defaultValue,
        onChange,
        multiple,
        closeOnSelect = multiple !== true,
        showSelected = true,
        renderValue,
        placeholder = selectDefaults.placeholder,
        placeholderColor,
        hideChevron,
        loading = false,
        label,
        labelColor,
        comment,
        variant,
        size,
        perspective3d,
        parallax,
        animate,
        color,
        font,
        error: errorProp,
        disabled: disabledProp,
        required,
        emptyMessage = selectDefaults.emptyMessage,
        visibleOptions = selectDefaults.visibleOptions,
        panel,
        validate: validateProp,
        id: idProp,
        state,
        linkState,
        'aria-label': ariaLabel,
        'aria-describedby': describedBy,
        'data-point-events': dataPointEvents,
        ...restProps
    } = fieldProps;
    const field = useFormField<T | null | T[]>(name);
    const bound =
        field &&
        valueProp === undefined &&
        (multiple
            ? isValueArray(field.value) || field.value === undefined
            : field.value === null || typeof field.value === 'string' || field.value === undefined);
    const boundValue = bound
        ? multiple
            ? isValueArray(field.value)
                ? (field.value as T[])
                : []
            : typeof field.value === 'string'
              ? (field.value as T)
              : null
        : valueProp;
    const disabled = disabledProp || Boolean(bound && field.disabled);
    // Хук хранит общий `T | null | T[]`; наружу значение уходит типом своей ветки `multiple`.
    const emitChange = (next: T | null | T[]) => {
        if (multiple) {
            if (isValueArray(next)) {
                if (bound) field.change(next);
                onChange?.(next);
            }
        } else if (!isValueArray(next)) {
            if (bound) field.change(next);
            onChange?.(next);
        }
    };

    const validateValue = (next: T | null | T[]) => {
        if (multiple) return isValueArray(next) ? validateProp?.(next) : undefined;
        return isValueArray(next) ? undefined : validateProp?.(next);
    };

    const layoutProps = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });

    const select = useSelect(ref, {
        options,
        search,
        form,
        value: boundValue,
        defaultValue,
        onChange: emitChange,
        multiple: multiple === true,
        closeOnSelect,
        showSelected,
        renderValue,
        placeholder,
        loading,
        disabled,
        required,
        emptyMessage,
        visibleOptions,
        validate: validateValue,
        id: idProp,
        error: errorProp ?? (bound ? field.error : undefined),
        label,
        comment,
        ariaLabel,
        describedBy,
        helperPadding: fieldHelperPaddingLeft(layoutProps.p, layoutProps.pl),
    });

    const rootCollapse = useCollapseState(collapse ?? { open: true });
    const { defaultOpen: _defaultCollapseOpen, ...collapseSettings } = collapse ?? {};
    const isCollapsed = !rootCollapse.open;

    useEffect(() => {
        if (isCollapsed) select.popup.close(false);
    }, [select.popup.close, isCollapsed]);

    const panelStyle = {
        '--select-visible-options': String(select.popup.visibleOptions),
    } as CSSProperties;

    return {
        select,
        loading,
        search,
        multiple,
        frame: {
            label: label
                ? { ...select.label, text: label, required, color: labelColor }
                : undefined,
            feedback: select.feedback.below,
            layout: {
                ...restProps,
                collapse: collapse
                    ? {
                          ...collapseSettings,
                          open: rootCollapse.open,
                          onOpenChange: rootCollapse.changeOpen,
                      }
                    : undefined,
                className: cx(
                    styles.Select,
                    styles.SelectWrapper,
                    ...fieldRootLayoutClasses(classes, box),
                    ...classes.value('text', font ? [font, font, font] : undefined),
                    className,
                ),
                style,
                perspective3d,
                parallax,
                animate,
                linkState,
                'data-point-events': dataPointEvents,
                ...stateProps(
                    state,
                    select.feedback.error && 'error',
                    disabled && 'disabled',
                    select.popup.open && 'open',
                ),
            },
        },
        trigger: {
            font,
            'data-ui-form-field': bound ? name : undefined,
            'aria-invalid': props['aria-invalid'] ?? select.trigger.accessibility['aria-invalid'],
            select,
            search: search
                ? { ...search, placeholder: search.placeholder ?? placeholder }
                : undefined,
            loading,
            disabled,
            required,
            placeholderColor,
            hideChevron,
        },
        dropdown: {
            'data-ui-preset-field': '',
            ref: geometryRef,
            open: select.popup.open,
            keyboard: search ? ('content' as const) : undefined,
            preserveFocus: Boolean(search),
            returnFocus: search ? select.trigger.inputRef : undefined,
            onOpenChange: select.popup.change,
            onClick(event: MouseEvent<HTMLElement>) {
                if (
                    event.target === event.currentTarget &&
                    !event.defaultPrevented &&
                    !disabled &&
                    (!loading || search)
                ) {
                    select.popup.change(!select.popup.open);
                }
            },
            className: cx(
                styles.field,
                ...fieldLayoutClasses(classes, layoutProps),
                fieldClassName,
            ),
            style: panelStyle,
            ...stateProps(
                state,
                select.feedback.error && 'error',
                disabled && 'disabled',
                select.popup.open && 'open',
            ),
            panel: {
                portal: true,
                offset: -1,
                ...panel,
                matchTriggerWidth: true,
                anchorRef: geometryRef,
                inheritVariables: selectPanelVariables,
                className: cx(styles.Dropdown, search && styles.SearchDropdown),
                style: panelStyle,
                onKeyDown: select.trigger.onKeyDown,
            },
        },
        form: {
            name,
            id: form,
            values:
                name && !disabled ? selectFormValues(select.value.current, multiple === true) : [],
        },
    };
}
