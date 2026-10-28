/** Delegated native scrollbar activity. One listener set per document, shared by all consumers. */
const documents = new WeakMap<Document, { references: number; dispose: () => void }>();
const ACTIVE = 'data-ui-scrollbar-active';

interface Activity {
    hovered: boolean;
    focused: boolean;
    dragging: boolean;
    timer: ReturnType<typeof setTimeout> | undefined;
}

function targets(target: EventTarget | null, document: Document): HTMLElement[] {
    let element = target === document ? document.scrollingElement : target;
    const result: HTMLElement[] = [];
    const constructor = document.defaultView?.HTMLElement;
    while (constructor && element instanceof constructor) {
        if (element.classList.contains('ui-scrollbar')) result.push(element);
        element = element.parentElement;
    }
    return result;
}

function mount(document: Document): () => void {
    document.documentElement.setAttribute('data-ui-scrollbar-ready', '');
    const states = new Map<HTMLElement, Activity>();
    const view = document.defaultView;
    const state = (element: HTMLElement): Activity => {
        const existing = states.get(element);
        if (existing) return existing;
        const next: Activity = { hovered: false, focused: false, dragging: false, timer: undefined };
        states.set(element, next);
        return next;
    };
    const cancel = (activity: Activity) => {
        if (activity.timer !== undefined) clearTimeout(activity.timer);
        activity.timer = undefined;
    };
    const reveal = (element: HTMLElement): Activity => {
        const activity = state(element);
        cancel(activity);
        element.setAttribute(ACTIVE, '');
        return activity;
    };
    const rest = (element: HTMLElement, activity: Activity) => {
        cancel(activity);
        if (activity.hovered || activity.focused || activity.dragging) return;
        const seconds = Number.parseFloat(view?.getComputedStyle(element).getPropertyValue('--ui-scrollbar-hide-delay') ?? '');
        activity.timer = setTimeout(() => {
            element.removeAttribute(ACTIVE);
            states.delete(element);
        }, Number.isFinite(seconds) ? Math.max(0, seconds) * 1000 : 0);
    };
    const over = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        for (const element of targets(event.target, document)) reveal(element).hovered = true;
    };
    const out = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        for (const element of targets(event.target, document)) {
            if (view && event.relatedTarget instanceof view.Node && element.contains(event.relatedTarget)) continue;
            const activity = states.get(element);
            if (activity) { activity.hovered = false; rest(element, activity); }
        }
    };
    const scroll = (event: Event) => {
        // Scroll does not bubble: a capture listener sees nested, portal and root viewports.
        const element = targets(event.target, document)[0];
        if (element) rest(element, reveal(element));
    };
    const down = (event: PointerEvent) => {
        if (event.button !== 0) return;
        for (const element of targets(event.target, document)) {
            const box = element.getBoundingClientRect();
            const left = box.left + element.clientLeft, top = box.top + element.clientTop;
            const vertical = element.scrollHeight > element.clientHeight && (event.clientX >= left + element.clientWidth || event.clientX < left);
            const horizontal = element.scrollWidth > element.clientWidth && event.clientY >= top + element.clientHeight;
            if (vertical || horizontal) reveal(element).dragging = true;
        }
    };
    const release = () => {
        for (const [element, activity] of states) {
            if (activity.dragging) { activity.dragging = false; rest(element, activity); }
        }
    };
    const focus = (event: FocusEvent) => {
        for (const element of targets(event.target, document)) {
            if (element === event.target && element.matches(':focus-visible')) reveal(element).focused = true;
        }
    };
    const blur = (event: FocusEvent) => {
        for (const element of targets(event.target, document)) {
            const activity = states.get(element);
            if (activity) { activity.focused = false; rest(element, activity); }
        }
    };
    const reset = () => {
        for (const [element, activity] of states) { cancel(activity); element.removeAttribute(ACTIVE); }
        states.clear();
    };
    const restore = () => {
        for (const element of document.querySelectorAll<HTMLElement>('.ui-scrollbar:hover')) reveal(element).hovered = true;
    };
    const visibility = () => { if (document.hidden) reset(); else restore(); };
    const observer = view ? new view.MutationObserver(() => {
        for (const [element, activity] of states) {
            if (!element.isConnected) { cancel(activity); element.removeAttribute(ACTIVE); states.delete(element); }
        }
    }) : undefined;
    observer?.observe(document, { childList: true, subtree: true });
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', out, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true, capture: true });
    document.addEventListener('scroll', scroll, { passive: true, capture: true });
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    document.addEventListener('visibilitychange', visibility);
    view?.addEventListener('pointerup', release, true);
    view?.addEventListener('pointercancel', release, true);
    view?.addEventListener('blur', reset);
    view?.addEventListener('focus', restore);
    // Hydration can finish under a stationary pointer without another pointerover event.
    restore();
    return () => {
        document.documentElement.removeAttribute('data-ui-scrollbar-ready');
        observer?.disconnect();
        reset();
        document.removeEventListener('pointerover', over);
        document.removeEventListener('pointerout', out);
        document.removeEventListener('pointerdown', down, true);
        document.removeEventListener('scroll', scroll, true);
        document.removeEventListener('focusin', focus);
        document.removeEventListener('focusout', blur);
        document.removeEventListener('visibilitychange', visibility);
        view?.removeEventListener('pointerup', release, true);
        view?.removeEventListener('pointercancel', release, true);
        view?.removeEventListener('blur', reset);
        view?.removeEventListener('focus', restore);
    };
}

/** Reference counted: nested ScrollArea/Modal and an application root share listeners and cleanup. */
export function observeScrollbarActivity(document: Document): () => void {
    let entry = documents.get(document);
    if (!entry) { entry = { references: 0, dispose: mount(document) }; documents.set(document, entry); }
    entry.references++;
    return () => {
        entry.references--;
        if (entry.references === 0) { entry.dispose(); documents.delete(document); }
    };
}
