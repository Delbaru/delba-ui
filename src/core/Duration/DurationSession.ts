import type { DurationOptions, DurationUnit } from './Duration.types';
import { clampDuration, durationMaximum, durationParts, durationStep } from './math';
import type { DurationModifiers } from './math';

/** Draft and commit ownership shared by keyboard and native wheel input. */
export class DurationSession {
    private options: DurationOptions;
    private committed: number;
    private listeners = new Set<() => void>();
    private snapshot: { hours: string; minutes: string };

    constructor(options: DurationOptions) {
        this.options = options;
        this.committed = this.clamp(options.value);
        this.snapshot = this.format(this.committed);
    }

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    getSnapshot = () => this.snapshot;

    sync(options: DurationOptions) {
        const previous = this.options;
        this.options = options;
        if (
            !Object.is(previous.value, options.value) ||
            !Object.is(previous.scope, options.scope) ||
            durationMaximum(previous.maxMinutes) !== durationMaximum(options.maxMinutes) ||
            previous.disabled !== options.disabled
        ) {
            this.committed = this.clamp(options.value);
            this.publish(this.format(this.committed));
        }
    }

    clamp = (value: number) => clampDuration(value, this.options.maxMinutes);

    change = (unit: DurationUnit, value: string) => {
        if (this.options.disabled) return;
        const pattern = unit === 'hours' ? /^\d{0,5}$/ : /^\d{0,3}$/;
        if (pattern.test(value)) this.publish({ ...this.snapshot, [unit]: value });
    };

    commit = () => {
        if (!this.options.disabled) this.save(this.draftTotal());
    };

    cancel = () => {
        this.committed = this.clamp(this.options.value);
        this.publish(this.format(this.committed));
    };

    step = (unit: number, direction: number, modifiers: DurationModifiers) => {
        if (this.options.disabled) return;
        this.save(this.draftTotal() + direction * durationStep(unit, modifiers));
    };

    key = (
        unit: number,
        event: DurationModifiers & {
            key: string;
            defaultPrevented: boolean;
            nativeEvent?: { isComposing?: boolean };
            preventDefault(): void;
        },
    ) => {
        if (this.options.disabled || event.defaultPrevented || event.nativeEvent?.isComposing)
            return;
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            this.step(unit, event.key === 'ArrowUp' ? 1 : -1, event);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            this.commit();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancel();
        }
    };

    wheel = (event: WheelEvent, root: HTMLElement) => {
        if (this.options.disabled || event.defaultPrevented || !event.deltaY) return;
        const ElementClass = root.ownerDocument.defaultView?.Element;
        if (!ElementClass || !(event.target instanceof ElementClass)) return;
        const input = event.target.closest('input[data-duration-unit]');
        if (
            !input ||
            !root.contains(input) ||
            input.hasAttribute('disabled') ||
            input.hasAttribute('readonly')
        )
            return;
        const unit = Number(input.getAttribute('data-duration-unit'));
        if (unit !== 60 && unit !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        this.step(unit, event.deltaY < 0 ? 1 : -1, event);
    };

    private save(value: number) {
        const next = this.clamp(value);
        this.publish(this.format(next));
        if (next === this.committed) return;
        this.committed = next;
        this.options.onChange(next);
    }

    private draftTotal() {
        return Number(this.snapshot.hours) * 60 + Number(this.snapshot.minutes);
    }

    private format(value: number) {
        const parts = durationParts(value, this.options.maxMinutes);
        return { hours: String(parts.hours), minutes: String(parts.minutes).padStart(2, '0') };
    }

    private publish(snapshot: { hours: string; minutes: string }) {
        if (snapshot.hours === this.snapshot.hours && snapshot.minutes === this.snapshot.minutes)
            return;
        this.snapshot = snapshot;
        this.listeners.forEach((listener) => listener());
    }
}

export function bindDurationWheel(root: HTMLElement, session: DurationSession): () => void {
    const wheel = (event: WheelEvent) => session.wheel(event, root);
    root.addEventListener('wheel', wheel, { passive: false });
    return () => root.removeEventListener('wheel', wheel);
}
