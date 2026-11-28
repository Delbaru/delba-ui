import type { EditOptions, EditState } from './Edit.types';

/** Per-editor lifecycle, independent of product commands and DOM. */
export class EditSession {
    private options: EditOptions;
    private before: string;
    private generation = 0;
    private listeners = new Set<() => void>();
    private state: EditState;

    constructor(options: EditOptions) {
        this.options = options;
        this.before = options.value;
        this.state = this.initial(options);
    }

    private initial(options: EditOptions): EditState {
        return {
            value: options.value,
            editing: options.editing ?? options.defaultEditing ?? false,
            pending: false,
            dirty: false,
            hasError: false,
            error: undefined,
        };
    }

    getSnapshot = (): EditState => this.state;

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private patch(next: Partial<EditState>) {
        const state = { ...this.state, ...next };
        const unchanged = (Object.keys(state) as (keyof EditState)[]).every((key) =>
            Object.is(state[key], this.state[key]));
        if (unchanged) return;
        this.state = state;
        this.listeners.forEach((listener) => listener());
    }

    sync(options: EditOptions) {
        const previous = this.options;
        this.options = options;
        if (options.scope !== previous.scope) {
            this.generation += 1;
            this.before = options.value;
            this.patch(this.initial(options));
            return;
        }
        if (options.editing !== undefined && options.editing !== this.state.editing) {
            if (options.editing) this.before = options.value;
            this.patch({ editing: options.editing });
        }
        if (!options.onCommit || (!this.state.editing && options.value !== previous.value)) {
            this.patch({
                value: options.value,
                dirty: this.state.editing && options.value !== this.before,
            });
        }
        if (options.canEdit === false && this.state.editing && !this.state.pending) this.cancel();
    }

    private setEditing(editing: boolean) {
        this.patch({ editing });
        this.options.onEditingChange?.(editing);
    }

    start = () => {
        if (this.options.canEdit === false || this.state.pending || this.state.editing) return;
        this.before = this.state.value;
        this.patch({ dirty: false, hasError: false, error: undefined });
        this.setEditing(true);
    };

    change = (value: string) => {
        if (this.state.pending || this.options.canEdit === false) return;
        if (!this.options.onCommit) this.options.onChange?.(value);
        this.patch({ value, dirty: value !== this.before, hasError: false, error: undefined });
    };

    cancel = () => {
        if (this.state.pending) return;
        if (!this.options.onCommit) this.options.onChange?.(this.before);
        this.patch({ value: this.before, dirty: false, hasError: false, error: undefined });
        this.setEditing(false);
    };

    commit = async (): Promise<boolean> => {
        if (!this.state.editing || this.state.pending || this.options.canEdit === false)
            return false;
        const options = this.options;
        if (!options.onCommit) {
            this.patch({ dirty: false });
            this.setEditing(false);
            options.onDone?.();
            return true;
        }
        const next = options.trim ? this.state.value.trim() : this.state.value;
        if ((options.allowEmpty === false && !next) || next === options.value) {
            this.cancel();
            return true;
        }
        const generation = this.generation;
        this.patch({ pending: true, hasError: false, error: undefined });
        try {
            await options.onCommit(next);
            if (generation !== this.generation) return false;
            const refreshed = this.options.value !== options.value;
            const value = options.resetOnCommit
                ? this.options.value
                : refreshed
                  ? this.options.value
                  : next;
            this.before = value;
            this.patch({ value, dirty: false, pending: false });
            this.setEditing(false);
            options.onDone?.();
            return true;
        } catch (error) {
            if (generation !== this.generation) return false;
            this.patch({ pending: false, hasError: true, error });
            this.setEditing(true);
            return false;
        }
    };

    dispose() {
        this.generation += 1;
    }
}
