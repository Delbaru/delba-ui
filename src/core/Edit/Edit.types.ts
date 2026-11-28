import type { ChangeEvent, KeyboardEvent, RefCallback } from 'react';

export type EditElement = HTMLInputElement | HTMLTextAreaElement;

export interface EditState {
    value: string;
    editing: boolean;
    pending: boolean;
    dirty: boolean;
    hasError: boolean;
    error: unknown;
}

export interface EditOptions {
    value: string;
    /** Changing identity discards the draft and ignores completion of the old save. */
    scope?: string;
    /** Controlled draft mode; the consumer owns each keystroke. */
    onChange?: (value: string) => void;
    /** Commit mode; reject on failure. The mechanism retains the draft and error. */
    onCommit?: (value: string) => Promise<unknown>;
    /** Controlled open state; onEditingChange reports requests to its owner. */
    editing?: boolean;
    defaultEditing?: boolean;
    onEditingChange?: (editing: boolean) => void;
    onDone?: () => void;
    canEdit?: boolean;
    multiline?: boolean;
    trim?: boolean;
    allowEmpty?: boolean;
    /** A successful creation returns the editor to its empty initial value. */
    resetOnCommit?: boolean;
    autoContinue?: (value: string, caret: number) => { value: string; caret: number } | null;
    /** Editing, dirty or pending. Unmount reports false for leave guards. */
    onActivityChange?: (active: boolean) => void;
}

export interface EditController extends EditState {
    start(): void;
    cancel(): void;
    commit(): Promise<boolean>;
    change(value: string): void;
    inputProps: {
        ref: RefCallback<EditElement>;
        value: string;
        readOnly: boolean;
        'aria-busy': boolean;
        'aria-invalid': boolean;
        onChange(event: ChangeEvent<EditElement>): void;
        onBlur(): void;
        onKeyDown(event: KeyboardEvent<EditElement>): void;
    };
}
