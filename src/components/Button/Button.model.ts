import { resolvePresetProps } from '../../core/Preset';
import type { MouseEventHandler } from 'react';
import {
    boxLayout,
    createLayoutClasses,
    cx,
    splitBoxLayout,
    stateProps,
    type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import { useTooltipScope } from '../../core/Popup/TooltipScope';
import { useFormScope } from '../../core/Form/Context';
import { useActionInvocation } from '../../hooks/useActionInvocation';
import { BUTTON_COLLAPSE_FRAME, DEFAULT_BUTTON_TYPE } from './Button.config';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.scss';

const c = createLayoutClasses(styles);

export function useButton(input: WithRef<ButtonProps, HTMLElement>) {
    const {
        ref,
        children,
        className,
        collapse,
        variant,
        size,
        dir,
        justifyContent,
        alignItems,
        textAlign,
        gap,
        perspective3d,
        parallax,
        animate,
        color,
        font,
        state,
        active,
        disabled = false,
        type = DEFAULT_BUTTON_TYPE,
        onClick,
        ui,
        linkState,
        onActionSettled,
        actionName,
        'aria-busy': ariaBusy,
        ...props
    } = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const tooltipScope = useTooltipScope();
    const scopedTitleHidden =
        ui?.popup?.preset === 'tooltip' && ui.popup.scoped === true && !tooltipScope;
    const action = ui?.action;
    const form = useFormScope();
    const local = useActionInvocation({
        action: action?.controller ? undefined : (action?.run ?? onClick),
        onSettled: onActionSettled,
        actionName,
        identity: action?.run ? action.identity : undefined,
        admissionKey: action?.run ? action.admissionKey : undefined,
        onSuccess: action?.run ? action.onSuccess : undefined,
        onCancel: action?.run ? action.onCancel : undefined,
    });
    const pending = action?.controller?.pending ?? local.pending;
    const effectiveDisabled = disabled || pending || !!action?.disabled;
    const isNativeButton = !rest.href;

    const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
        if (action?.controller) {
            const native = event.currentTarget;
            // Submit through the owning form so native validation and onSubmit run once.
            if (
                isNativeButton &&
                type === 'submit' &&
                form?.submit === action.controller.invoke &&
                native.form &&
                native.form === native.closest('[data-ui-form-scope]')
            )
                return;
            event.preventDefault();
            void action.controller.invoke();
            return;
        }

        if (action?.run) event.preventDefault();
        void local.invoke(event);
    };

    const element = useInteractiveElement({
        as: 'button',
        ref,
        motion: { perspective3d, parallax, animate },
        popup: collapse?.open === false ? undefined : ui?.popup,
        disabled: effectiveDisabled,
        linkState,
        className: cx(
            styles.Button,
            ...c.value('variant', variant),
            ...c.value('size', size),
            ...c.value('dir', dir),
            ...c.value('justify', justifyContent),
            ...c.value('align', alignItems),
            ...c.value('textAlign', textAlign),
            ...c.value('gap', gap),
            ...boxLayout(c, box),
            ...c.value('color', color),
            ...c.value('text', font ? [font, font, font] : undefined),
            className,
        ),
        root: {
            ...stateProps(
                state,
                active && 'active',
                effectiveDisabled && 'disabled',
                pending && 'loading',
            ),
            ...rest,
            title: scopedTitleHidden ? undefined : rest.title,
            ...(isNativeButton ? { type, disabled: effectiveDisabled } : undefined),
            'aria-busy': ariaBusy ?? (pending || undefined),
            onClick: handleClick,
        },
    });

    return {
        ...element,
        collapse: collapse && { ...collapse, ...BUTTON_COLLAPSE_FRAME },
        children,
    };
}
