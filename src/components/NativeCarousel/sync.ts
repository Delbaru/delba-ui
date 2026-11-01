import type { NativeCarouselController } from './controller';

export interface CarouselSynchronizationOptions {
    /** Any member can lead. When false, only the first controller leads. Defaults to true. */
    bidirectional?: boolean;
    /** Apply the first mounted controller's index immediately and when partners mount. Defaults to true. */
    initial?: boolean;
}

/** Synchronize source-slide indices, not ratios of reachable pages. Returns idempotent cleanup.
 * A partner showing several slides may clamp at its last reachable page; that clamp never feeds back.
 */
export function synchronizeCarousels(controllers: readonly NativeCarouselController[], options: CarouselSynchronizationOptions = {}) {
    const members = [...new Set(controllers)];
    const indices = new Map(members.map(controller => [controller, controller.getSnapshot().index]));
    const counts = new Map(members.map(controller => [controller, controller.getSnapshot().pageCount]));
    let applying = false;
    let disposed = false;
    const first = members.find(controller => controller.getSnapshot().pageCount);
    let hasLeader = Boolean(first);
    let desired = first?.getSnapshot().index ?? 0;
    const apply = (source?: NativeCarouselController) => {
        if (applying || disposed) return;
        applying = true;
        try {
            for (const target of members) {
                if (target === source || !target.getSnapshot().pageCount) continue;
                const state = target.getSnapshot();
                const index = Math.min(Math.max(0, desired), state.pageCount - 1);
                if (state.index !== index) target.goTo(index);
                indices.set(target, target.getSnapshot().index);
                counts.set(target, target.getSnapshot().pageCount);
            }
        } finally { applying = false; }
    };
    const cleanups = members.map((controller, memberIndex) => controller.subscribe(() => {
        const state = controller.getSnapshot();
        const changed = state.index !== indices.get(controller);
        const resized = state.pageCount !== counts.get(controller);
        indices.set(controller, state.index);
        counts.set(controller, state.pageCount);
        if (disposed || applying || !state.pageCount) return;
        if (!hasLeader) { hasLeader = true; desired = state.index; }
        if (resized && options.initial !== false) { apply(); return; }
        if (!changed || (options.bidirectional === false && memberIndex !== 0)) return;
        desired = state.index;
        apply(controller);
    }));
    if (options.initial !== false) apply(members.find(controller => controller.getSnapshot().pageCount));
    return () => { if (disposed) return; disposed = true; cleanups.forEach(cleanup => cleanup()); };
}
