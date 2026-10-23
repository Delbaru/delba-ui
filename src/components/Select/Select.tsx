'use client';

import styles from './Select.module.scss';

import { useEffect, type CSSProperties } from 'react';
import type React from 'react';
import { assetUrl, composeEventHandlers, cx, createLayoutClasses, stateProps, stateLinkProps, fieldHelperPaddingLeft, type BoxLayoutProps, type ComponentStateValue, type StateLinkInput, type ResponsiveValue, type WithRef, fieldLayoutClasses, fieldRootLayoutClasses, resolveFieldLayout, splitBoxLayout } from '../../core';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { Skeleton } from '../Skeleton';
import { Flex } from '../Flex';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import { useCollapseState } from '../../hooks/useCollapseState';
import { Box } from '../Box';
import { Dropdown } from '../Dropdown';
import { isValueArray, selectFormValues, type SelectItem } from './options';
import { useSelect, type SelectRenderValuePayload } from './useSelect';

import arrowIcon from '../../../assets/icons/ui/arrows/arrow-2/arrow.svg';
import checkIcon from '../../../assets/icons/ui/check/succsess_check_black.svg';

type VariantKey = 'primary' | 'primaryFill' | 'secondary';
type SizeKey = 'default' | 'fullWidth';

const c = createLayoutClasses(styles, { local: { h: 'height' } });

const DEFAULT_PLACEHOLDER = 'Выберите значение';
const DEFAULT_EMPTY_MESSAGE = 'Выберите значение';
const DEFAULT_VISIBLE_OPTIONS = 4;
const PANEL_VARIABLES = ['--select-height', '--select-dropdown-radius', '--select-dropdown-radius-top'] as const;

/** Пропсы Select без значения. Обёртке: `SelectBaseProps<T> & SelectValueProps<T>`, а не `extends SelectProps`. */
export interface SelectBaseProps<T extends string = string>
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'dir' | 'rel'>,
        BoxLayoutProps,
    SharedMotionProps {
    className?: string;

    /** Сворачивает всё поле вместе с подписью и ошибкой; не управляет списком вариантов. */
    collapse?: CollapseOptions;

    /** Класс на САМ триггер (внутренний .Select — тот, что несёт фон/рамку), а не на обёртку
     *  с label/comment, куда садится className. Нужен скин-обёрткам (SharedSelect), которые
     *  красят поле осями из components/system/_axes.scss: без этого класс-ось приземлился бы
     *  на обёртку и покрасил бы заодно подпись. */
    fieldClassName?: string;

    style?: CSSProperties;

    options: readonly SelectItem<T>[];
    /** Имя поля в FormData. При multiple каждое выбранное значение отправляется отдельной записью. */
    name?: string;
    /** ID формы, когда Select расположен вне её DOM-поддерева. */
    form?: string;

    /**
     * Закрывать список сразу после выбора. У ОДИНОЧНОГО селекта так и так: выбор там один, и
     * список больше не нужен. Флаг нужен `multiple` — тот намеренно остаётся открытым, чтобы
     * отметить несколько подряд, но полю, где обычно выбирают одно («Тест» в приглашении),
     * открытый список только закрывает собой форму.
     *
     * Опт-ин: включить всем `multiple` нельзя — отметить три значения стало бы тремя заходами.
     */
    closeOnSelect?: boolean;

    /** Показывать уже выбранные значения в dropdown. */
    showSelected?: boolean;

    /**
     * Полностью кастомный рендер выбранного значения.
     * Удобно для multiple или сложной верстки в trigger.
     */
    renderValue?: (payload: SelectRenderValuePayload<T>) => React.ReactNode;

    placeholder?: string;
    placeholderColor?: string;
    /**
     * Значение ещё грузится — вместо подписи скелетон (см. `Skeleton`, §4).
     *
     * Шеврон при этом ОСТАЁТСЯ, а раскрытие выключается: убери шеврон — и на его приезде
     * подпись дёрнется вбок; оставь раскрытие — человек откроет пустой список и решит,
     * что вариантов нет.
     */
    loading?: boolean;
    label?: string;
    labelColor?: string;
    comment?: string;

    variant?: ResponsiveValue<VariantKey>;
    size?: ResponsiveValue<SizeKey>;


    color?: string;

    error?: string;

    disabled?: boolean;
    required?: boolean;
    emptyMessage?: string;
    visibleOptions?: number;

    state?: ComponentStateValue;

    linkState?: StateLinkInput;

    id?: string;
    'aria-label'?: string;
    'data-point-events'?: string;
}

/**
 * Значение по ветке `multiple`: одиночный выбор — `T | null`, множественный — `T[]`.
 * `defaultValue` не участвует в выводе `T`: литерал `['ru']` иначе сузил бы тип опций до `'ru'`.
 */
export type SelectValueProps<T extends string = string> =
    | {
          multiple?: false;
          value?: T | null;
          defaultValue?: NoInfer<T> | null;
          onChange?: (value: T | null) => void;
          validate?: (value: T | null) => string | undefined;
      }
    | {
          multiple: true;
          value?: T[];
          defaultValue?: NoInfer<T>[];
          onChange?: (value: T[]) => void;
          validate?: (value: T[]) => string | undefined;
      };

export type SelectProps<T extends string = string> = SelectBaseProps<T> & SelectValueProps<T>;

function isPrimitiveNode(node: React.ReactNode): node is string | number {
    return typeof node === 'string' || typeof node === 'number';
}

function renderSelectNode(node: React.ReactNode, textClassName: string | undefined): React.ReactNode {
    if (isPrimitiveNode(node)) {
        return (
            <Text variant={['body', 'body', 'body']} className={textClassName} color="inherit">{node}</Text>
        );
    }

    return node;
}

export function Select<T extends string = string>(props: WithRef<SelectProps<T>, HTMLDivElement>) {
    const { box, rest: fieldProps } = splitBoxLayout(props);
    const {
        ref,
        className = '',
        collapse,
        fieldClassName,
        style,
        options,
        name,
        form,
        value: valueProp,
        defaultValue,
        onChange,
        multiple,
        closeOnSelect = false,
        showSelected = true,
        renderValue,
        placeholder = DEFAULT_PLACEHOLDER,
        placeholderColor,
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
        error: errorProp,
        disabled,
        required,
        emptyMessage = DEFAULT_EMPTY_MESSAGE,
        visibleOptions = DEFAULT_VISIBLE_OPTIONS,
        validate: validateProp,
        id: idProp,
        state,
        linkState,
        onMouseEnter, onMouseMove, onMouseLeave, onMouseDown, onMouseUp,
        onClick, onFocus, onBlur,
        'aria-label': ariaLabel,
        'data-point-events': dataPointEvents,
        ...restProps
    } = fieldProps;
    // Хук хранит общий `T | null | T[]`; наружу значение уходит типом своей ветки `multiple`.
    const emitChange = (next: T | null | T[]) => {
        if (multiple) {
            if (isValueArray(next)) onChange?.(next);
        } else if (!isValueArray(next)) {
            onChange?.(next);
        }
    };

    const validateValue = (next: T | null | T[]) => {
        if (multiple) return isValueArray(next) ? validateProp?.(next) : undefined;
        return isValueArray(next) ? undefined : validateProp?.(next);
    };

    const {
        id, fieldRef,
        errorId, displayError, commentId, listboxId, open, focusedIndex, setFocusedIndex,
        showInlineError, hasSelectedValue, displayContent, dropdownItems, dropdownOptions,
        dropdownScrolls, normalizedVisibleOptions, triggerAccessibilityProps, dropdownRef,
        setWrapperRef, setOptionRef, motionHandlers, motionStyle, revealAttrs, handleOpenChange, handleKeyDown,
        handleSelect, handleDropdownWheelCapture, handleDropdownTouchMoveCapture, optionIndexOf,
        closeDropdown,
        isOptionSelected, formValue,
    } = useSelect(ref, {
        options, value: valueProp, defaultValue, onChange: emitChange, multiple: multiple === true, closeOnSelect,
        showSelected, renderValue, placeholder, loading, disabled, required, emptyMessage, visibleOptions,
        validate: validateValue,
        id: idProp, error: errorProp, label, comment, ariaLabel, perspective3d, parallax, animate,
    });

    const rootCollapse = useCollapseState(collapse ?? { open: true });
    const { defaultOpen: _defaultCollapseOpen, ...collapseSettings } = collapse ?? {};
    const isCollapsed = !rootCollapse.open;

    useEffect(() => {
        if (isCollapsed) closeDropdown(false);
    }, [closeDropdown, isCollapsed]);

    const layoutProps = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });

    const fieldClasses = fieldLayoutClasses(c, layoutProps);

    const optionsContent = (
        <Flex
            ref={dropdownRef}
            dir={['column', 'column', 'column']}
            id={listboxId}
            role="listbox"
            scrollFade
            className={styles.DropdownScroll}
            data-scrolls={dropdownScrolls || undefined}
            aria-hidden={!open}
            aria-multiselectable={multiple || undefined}
            aria-activedescendant={
                open && focusedIndex >= 0 && dropdownOptions[focusedIndex]
                    ? `${id}-option-${focusedIndex}`
                    : undefined
            }
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            onWheelCapture={handleDropdownWheelCapture}
            onTouchMoveCapture={handleDropdownTouchMoveCapture}
        >
            {dropdownItems.map((item) => {
                if (item.type === 'group') {
                    return (
                        <Text
                            key={item.key}
                            as="div"
                            variant={['caption', 'caption', 'caption']}
                            className={styles.GroupLabel}
                            color="var(--text-muted)"
                        >{item.label}</Text>
                    );
                }

                const opt = item.option;
                const optionIndex = optionIndexOf(opt);
                const isSelected = isOptionSelected(opt);
                const isFocused = optionIndex === focusedIndex;
                const optionContent = opt.children ?? opt.label;

                return (
                    // Короткий зазор оставляет больше места переносимой подписи.
                    <Flex
                        key={item.key}
                        ref={setOptionRef(optionIndex)}
                        align={['center', 'center', 'center']}
                        justify={['space_between', 'space_between', 'space_between']}
                        gap={[8, 8, 8]}
                        id={`${id}-option-${optionIndex}`}
                        role="option"
                        aria-label={opt.label}
                        aria-selected={isSelected}
                        className={styles.Option}
                        {...stateProps(isSelected && 'selected', isFocused && 'focused')}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setFocusedIndex(optionIndex)}
                    >
                        {/* Строка — сам option; галочка только помечает его состояние. */}
                        {multiple && (
                            <Flex
                                aria-hidden
                                className={styles.OptionCheck}
                                align={['center', 'center', 'center']}
                                justify={['center', 'center', 'center']}
                                w={[24, 24, 24]}
                                h={[24, 24, 24]}
                                r={[8, 8, 8]}
                            >
                                <Icon
                                    aria-hidden
                                    src={assetUrl(checkIcon)}
                                    fill="var(--white-100)"
                                    w={[16, 16, 16]}
                                    h={[16, 16, 16]}
                                    className={styles.OptionCheckIcon}
                                />
                            </Flex>
                        )}

                        <Box className={styles.OptionContent}>
                            {renderSelectNode(optionContent, styles.OptionLabel)}
                        </Box>
                    </Flex>
                );
            })}
        </Flex>
    );

    const trigger = (
        <Flex
            ref={fieldRef}
            align={['center', 'center', 'center']}
            justify={['space_between', 'space_between', 'space_between']}
            gap={[8, 8, 8]}
            className={styles.SelectTrigger}
            w={['100%', '100%', '100%']}
            role="button"
            tabIndex={disabled ? -1 : 0}
            id={id}
            onKeyDown={handleKeyDown}
            {...triggerAccessibilityProps}
        >
            <Box
                className={styles.TriggerContent}
                style={{
                    color: showInlineError
                        ? 'var(--error)'
                        : !hasSelectedValue
                            ? placeholderColor ?? 'var(--field-placeholder-color, var(--text-muted))'
                            : undefined,
                }}
            >
                {/* Скелетон и значение подменяют друг друга на одном месте — значит
                    `transitionKey` (§8.4), а не голое условие: иначе полоса исчезает
                    кадром. Шеврон при этом снаружи обёртки и не мигает. */}
                <Flex
                    transitionKey={loading ? 'skeleton' : 'value'}
                    animation="fadeIn"
                    w={['100%', null, null]}
                >
                    {loading ? (
                        <Skeleton h={[16, null, null]} />
                    ) : showInlineError ? (
                        <Text
                            as="div"
                            id={errorId}
                            role="alert"
                            variant={['body', 'body', 'body']}
                            color="inherit"
                            className={styles.TriggerText}
                        >{displayError}</Text>
                    ) : (
                        renderSelectNode(displayContent, styles.TriggerText)
                    )}
                </Flex>
            </Box>

            <Icon
                aria-hidden
                src={assetUrl(arrowIcon)}
                fill="transparent"
                w={[20, 20, 20]}
                h={[20, 20, 20]}
                className={styles.Chevron}
            />
        </Flex>
    );

    return (
        <Flex
            collapse={collapse ? {
                ...collapseSettings,
                open: rootCollapse.open,
                onOpenChange: rootCollapse.changeOpen,
            } : undefined}
            href={undefined}
            dir={['column', 'column', 'column']}
            gap={[8, 8, 8]}
            className={cx(styles.SelectWrapper, ...fieldRootLayoutClasses(c, box), className)}
            style={{ ...(motionStyle ?? null), ...style }}
            ref={setWrapperRef}
            data-point-events={dataPointEvents}
            {...restProps}
            {...revealAttrs}
            {...stateLinkProps(linkState, {
                onMouseEnter: composeEventHandlers(motionHandlers?.onMouseEnter, onMouseEnter),
                onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
                onMouseLeave: composeEventHandlers(motionHandlers?.onMouseLeave, onMouseLeave),
                onMouseDown,
                onMouseUp,
                onClick,
                onFocus,
                onBlur,
            })}
        >
            {label && (
                <Flex dir={['row', 'row', 'row']} gap={required ? [4, 4, 4] : [0, 0, 0]}>
                    <Text variant={['caption', 'caption', 'caption']} color={labelColor}>{label}</Text>

                    {required && (
                        <Text variant={['caption', 'caption', 'caption']} color="var(--error)">*</Text>
                    )}
                </Flex>
            )}

            <Dropdown
                open={open}
                onOpenChange={handleOpenChange}
                trigger={trigger}
                className={cx(styles.Select, ...fieldClasses, fieldClassName)}
                style={{ '--select-visible-options': String(normalizedVisibleOptions) } as CSSProperties}
                {...stateProps(state, displayError && 'error', disabled && 'disabled', open && 'open')}
                panel={{
                    portal: true,
                    offset: -1,
                    matchTriggerWidth: true,
                    inheritVariables: PANEL_VARIABLES,
                    className: styles.Dropdown,
                    onKeyDown: handleKeyDown,
                }}
            >
                {optionsContent}
            </Dropdown>

            {name && !disabled && selectFormValues(formValue, multiple === true).map((itemValue, index) => (
                <input
                    key={`${itemValue}-${index}`}
                    type="hidden"
                    name={name}
                    form={form}
                    value={itemValue}
                />
            ))}

            {!displayError && comment && (
                <Text
                    as="div"
                    variant={['caption', 'caption', 'caption']}
                    id={commentId}
                    color="var(--text-muted)"
                    pl={fieldHelperPaddingLeft(layoutProps.p, layoutProps.pl)}
                >{comment}</Text>
            )}
        </Flex>
    );
}
