'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import type React from 'react';

import {
    cx, createLayoutClasses, fieldLayoutClasses, fieldRootLayoutClasses, fieldHelperPaddingLeft, resolveFieldLayout, splitBoxLayout,
    stateProps, stateLinkProps, useMergedRefs, type WithRef,
} from '../../core';
import { textFont } from '../../core/base/typography';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import { useTextOverflow } from '../../hooks/useTextOverflow';
import { useTooltip } from '../../hooks/useTooltip';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { Flex } from '../Flex';
import { Skeleton } from '../Skeleton';
import { Text } from '../Text';
import { Tooltip } from '../Tooltip';

import { Calendar } from './Calendar/Calendar';
import { DateToggle, NumberControls, PasswordToggle } from './InputActions';
import { InputBelowError, InputInlineError } from './InputFeedback';
import { TimeField } from './TimeField/TimeField';
import { DEFAULT_PHONE_FORMAT, maskGroups } from './lib/phone-mask';
import { useInputBehavior } from './lib/use-input-behavior';
import type { InputProps } from './types';
import styles from './Input.module.scss';

export type { InputProps } from './types';

const c = createLayoutClasses(styles, { local: { h: 'height' } });

export function Input(props: WithRef<InputProps, HTMLInputElement>) {
    const { box, rest: fieldProps } = splitBoxLayout(props);
    const {
        ref,
        className = '',
        style,
        variant,
        size,
        font,
        animate,
        perspective3d,
        parallax,
        color,
        placeholder,
        placeholderColor,
        seed,
        label,
        labelColor,
        comment,
        showNumberControls = true,
        revealable = false,
        loading = false,
        numberOptions,
        length,
        phone: phoneFormat = DEFAULT_PHONE_FORMAT,
        slots,
        type: typeProp,
        value: valueProp,
        defaultValue: defaultValueProp,
        error,
        collapse,
        id: idProp,
        disabled,
        onChange,
        onValueChange,
        onFocus,
        onBlur,
        onKeyDown: onInputKeyDown,
        required,
        emptyMessage,
        validate: validateProp,
        errorPlacement = 'inside',
        state,
        linkState,
        rowClassName,
        'data-point-events': dataPointEvents,
        ...rest
    } = fieldProps;
    const {
        id,
        innerRef,
        fieldRef,
        inputType,
        isPhone,
        isTime,
        isDate,
        isNumber,
        isReadOnly,
        hasError,
        helperText,
        rootRef,
        isFieldActive,
        hasValue,
        inputProps,
        handleFieldClick,
        handleNumberStep,
        timeField,
        datePicker,
    } = useInputBehavior({
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
        phoneFormat,
        restInputProps: rest,
    });

    const commentId = !hasError && helperText ? `${id}-comment` : undefined;
    const inlineErrorId = hasError ? `${id}-error` : undefined;
    const helperTextId = inlineErrorId ?? commentId;
    const inputDescribedBy = [inputProps['aria-describedby'], helperTextId].filter(Boolean).join(' ') || undefined;
    // У телефона место внутри поля уже занято префиксом «+7» и маской-образцом, и объяснение
    // ошибки туда не влезает: оно обрезается многоточием на первом же слове. Поэтому у такого
    // поля строка ошибки всегда ПОД ним, что бы ни просил вызов.
    const errorBelow = errorPlacement === 'below' || isPhone;
    // Слой поверх значения — только у `inside`. Он же гасит себя на фокусе: значение под ним
    // не видно, и правки вслепую быть не должно. У `below` этой развилки нет вовсе — строка
    // стоит рядом со значением и на фокусе остаётся, потому что она и есть объяснение правки.
    const inlineError = !errorBelow && hasError && !isFieldActive ? helperText : undefined;
    const belowError = errorBelow && hasError ? helperText : undefined;
    const commentText = !hasError ? helperText : undefined;
    // Показ пароля — МЕСТНОЕ состояние поля: это стадия просмотра, а не факт о данных, и в
    // сторе ему делать нечего (перезагрузи страницу — пароль снова скрыт, и так и надо).
    const [revealed, setRevealed] = useState(false);
    const showReveal = revealable && inputType === 'password';
    const showNumberArrows = isNumber && showNumberControls && !isReadOnly && !disabled
        && (rest.step !== 'any' || (numberOptions?.length ?? 0) > 0);

    const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ animate, perspective3d, parallax });
    const dateAnchorRef = useRef<HTMLElement | null>(null);
    const setWrapperRef = useCallback((node: HTMLElement | null) => {
        rootRef.current = node;
        setMotionNode(node);
    }, [setMotionNode]);

    // Тултип с полным значением, когда текст не влезает в поле и обрезается «…».
    // Логика тултипа общая (useTooltip → Button/Icon/Input), здесь только гейтим её обрезкой текста.
    const overflow = useTextOverflow<HTMLInputElement>();
    const isOverflowTooltipEnabled = overflow.isOverflowing && !isFieldActive && inputType !== 'password';
    const overflowTooltip = useTooltip<HTMLElement, HTMLDivElement>({
        enabled: isOverflowTooltipEnabled,
        direction: 'bottom',
        align: 'center',
        gap: 8,
    });
    const setFieldRowRef = useCallback((node: HTMLElement | null) => {
        dateAnchorRef.current = node;
        overflowTooltip.anchorRef.current = node;
    }, [overflowTooltip.anchorRef]);
    const setFieldRef = useMergedRefs(fieldRef, overflow.ref);
    // Нажатие по «обёртке» поля (паддинги, префикс «+7»), а не по самому инпуту, не должно
    // забирать у него фокус: иначе на mousedown происходит blur → валидация помечает поле
    // ошибкой и на миг показывается оверлей ошибки, который исчезает на mouseup. Фокус ставим
    // сами в onClick (handleFieldClick), поэтому здесь просто гасим нативное снятие фокуса.
    const handleFieldMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
        // Портал части поля всплывает по React-дереву, но не относится к клику по строке ввода.
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
        if (event.target instanceof Element && event.target.closest('[data-input-action="true"]')) return;
        if (event.target !== innerRef.current) {
            event.preventDefault();
        }
    }, [innerRef]);

    const layoutProps = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });
    const fieldClasses = fieldLayoutClasses(c, layoutProps);
    const typeClassName = inputType || undefined;
    // Класс кегля садится на РЯД, а не на `<input>`: его читают ещё маска телефона и префикс
    // «+7», а они полю не потомки, а соседи (см. `--field-font` в модуле).
    const fieldClassName = styles.field;
    const fontClassName = font ? styles.font : undefined;
    const fontStyle = font ? ({ ['--field-font-variant' as string]: textFont(font) } satisfies CSSProperties) : undefined;

    const content = (
        <Flex
            ref={setWrapperRef}
            dir={['column', 'column', 'column']}
            gap={[8, 8, 8]}
            className={cx(styles.wrapper, ...fieldRootLayoutClasses(c, box), typeClassName, styles[inputType], className)}
            style={{ ...(motionStyle ?? null), ...style }}
            {...revealAttrs}
            data-point-events={dataPointEvents}
            {...stateProps(isFieldActive && 'active')}
            {...stateLinkProps(linkState, { ...motionHandlers })}
        >
            {label && (
                <Flex dir={['row', 'row', 'row']} gap={[4, null, null]}>
                    <label htmlFor={id}>
                        <Text as="span" variant={['caption', 'caption', 'caption']} color={labelColor}>{label}</Text>
                    </label>
                    {required && ( <Text as="span" aria-hidden="true" variant={['caption', 'caption', 'caption']} color="var(--error)">*</Text> )}
                </Flex>
            )}
            <Flex
                ref={setFieldRowRef}
                dir={['row', 'row', 'row']}
                align={['center', 'center', 'center']}
                className={cx(styles.input, fontClassName, ...fieldClasses, rowClassName)}
                style={fontStyle}
                {...stateProps(state, hasError && 'error', isFieldActive && 'active', hasValue && 'filled', isReadOnly && 'readonly')}
                data-phone-prefix={isPhone || undefined}
                data-inline-error={inlineError ? 'true' : undefined}
                onMouseDown={handleFieldMouseDown}
                onClick={handleFieldClick}
                onMouseEnter={overflowTooltip.show}
                onMouseLeave={overflowTooltip.hide}
                gap={slots ? [8, 8, 8] : undefined}
            >
                {slots?.start != null && <div data-input-action="true" className={styles.addon}>{slots.start}</div>}
                {isPhone && (
                    // Префикс стоит В ПОТОКЕ ряда, а не абсолютом: так он центрируется тем же
                    // `align-items: center`, что и всё остальное, а поле начинается сразу за
                    // ним — без магического отступа, который приходилось держать в двух местах
                    // и который разъезжался, стоило смениться кеглю или масштабу темы.
                    // Шрифт даёт модуль (`--field-font`), поэтому класса типографики у префикса нет:
                    // утилита стоит слоем выше и перебила бы его.
                    <Text
                        variant={[null, null, null]}
                        color='var(--primary)'
                        className={styles.phonePrefix}
                    >
                        {phoneFormat.dial}
                    </Text>
                )}

                <div className={styles.fieldSlot}>
                    {/* Скелетон занимает ту же ячейку; своп нужен только при появлении input. */}
                    <Flex
                        transitionKey={loading ? 'skeleton' : 'value'}
                        animation='fadeIn'
                        w={['100%', '100%', '100%']}
                    >
                        {loading ? (
                            <Skeleton h={[16, null, null]} />
                        ) : (
                        <>
                            {/* Слой маски пропускает клики к нативному input. */}
                            {isPhone && !hasValue && (
                                <span aria-hidden className={styles.phoneMask}>
                                    {maskGroups(phoneFormat).map((group, groupIndex) => (
                                        <span key={groupIndex} className={styles.phoneMaskGroup}>
                                            {group.map((part, partIndex) => (
                                                <span key={partIndex} className={part.dim ? styles.phoneMaskDim : undefined}>
                                                    {part.text}
                                                </span>
                                            ))}
                                        </span>
                                    ))}
                                </span>
                            )}
                            {isTime ? (
                                <TimeField
                                    inputRef={setFieldRef}
                                    inputProps={{ ...inputProps, 'aria-describedby': inputDescribedBy }}
                                    fieldClassName={fieldClassName}
                                    showMask={inlineError ? false : timeField.showMask}
                                    maskValue={timeField.value}
                                    maskSuffix={timeField.suffix}
                                />
                            ) : (
                                <input
                                    ref={setFieldRef}
                                    className={fieldClassName}
                                    {...inputProps}
                                    // ПОСЛЕ спреда: `inputProps` несёт свой `type`, и переопределять
                                    // его надо здесь — иначе показ пароля молча не сработает (§12 про
                                    // пропы, которые атом выставляет после спреда).
                                    type={showReveal && revealed ? 'text' : inputProps.type}
                                    // У телефона нативный плейсхолдер гасим: его рисует слой-маска
                                    // выше, иначе обе строки наложились бы друг на друга.
                                    placeholder={isPhone ? '' : inputProps.placeholder}
                                    aria-describedby={inputDescribedBy}
                                />
                            )}
                        </>
                        )}
                    </Flex>
                    <InputInlineError id={inlineErrorId} message={inlineError} />
                </div>
                {slots?.end != null && <div data-input-action="true" className={styles.addon}>{slots.end}</div>}
                <PasswordToggle
                    visible={showReveal}
                    revealed={revealed}
                    onToggle={() => setRevealed((current) => !current)}
                />
                <DateToggle visible={isDate} onToggle={datePicker.onToggle} />
                <NumberControls visible={showNumberArrows} onStep={handleNumberStep} />
            </Flex>
            {errorBelow && <InputBelowError id={inlineErrorId} message={belowError} />}
            {overflow.isOverflowing && (
                <Tooltip ref={overflowTooltip.tooltipRef} {...overflowTooltip.bubbleProps}>
                    {overflow.text}
                </Tooltip>
            )}
            {isDate && (
                <Calendar
                    id={id}
                    anchorRef={dateAnchorRef}
                    floatingRef={datePicker.floatingRef}
                    isActive={datePicker.isActive}
                    visibleMonth={datePicker.visibleMonth}
                    setVisibleMonth={datePicker.setVisibleMonth}
                    selectedDate={datePicker.selectedDate}
                    calendarDays={datePicker.calendarDays}
                    isDateDisabled={datePicker.isDateDisabled}
                    onDateSelect={datePicker.onDateSelect}
                    onFocusLeave={datePicker.onDismiss}
                />
            )}
            {commentText && (
                <Text
                    as='div'
                    id={commentId}
                    variant={['caption', 'caption', 'caption']}
                    color='var(--text-muted)'
                    pl={fieldHelperPaddingLeft(layoutProps.p, layoutProps.pl)}
                >{commentText}</Text>
            )}
        </Flex>
    );

    if (!collapse) return content;

    return (
        <CollapseWrap {...collapse}>
            {content}
        </CollapseWrap>
    );
}
