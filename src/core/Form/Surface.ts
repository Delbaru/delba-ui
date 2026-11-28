import type { HTMLAttributes, KeyboardEvent, SubmitEvent } from 'react';
import { focusFormError } from './Context';
import type { FormScope } from './Form.types';

export function formSurfaceEvents(
    form: FormScope | undefined,
    native: boolean,
    onSubmit?: HTMLAttributes<HTMLElement>['onSubmit'],
) {
    const submit = (root: HTMLElement) => {
        if (!form || form.disabled || !form.ready) return;
        void form.submit();
        focusFormError(root, form);
    };
    return {
        onSubmit: form && native ? (event: SubmitEvent<HTMLElement>) => {
            if (event.target !== event.currentTarget) return;
            onSubmit?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            submit(event.currentTarget);
        } : onSubmit,
        onKeyDown: form && !native ? (event: KeyboardEvent<HTMLElement>) => {
            if (event.defaultPrevented || event.key !== 'Enter' || event.nativeEvent.isComposing || event.repeat ||
                event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target as HTMLElement;
            if (!target.matches?.('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"])') ||
                target.closest('[data-ui-form-scope]') !== event.currentTarget || !target.closest('form')) return;
            event.preventDefault();
            event.stopPropagation();
            submit(event.currentTarget);
        } : undefined,
    };
}
