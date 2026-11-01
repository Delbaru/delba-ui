/** Supported visible slide counts; fractional counts deliberately expose the next slide. */
export type NativeSlidesPerView = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 6;

export interface CarouselGeometry {
    offsets: readonly number[];
    visible: number;
}

/** Last page is clamped to the content edge, rather than leaving an empty final viewport. */
export function carouselGeometry(count: number, width: number, gap: number, visible: number): CarouselGeometry {
    if (count <= 0 || width <= 0 || visible <= 0) return { offsets: [0], visible };
    const slide = Math.max(0, (width - Math.max(0, visible - 1) * gap) / visible);
    const maximum = Math.max(0, count * slide + Math.max(0, count - 1) * gap - width);
    const offsets = [0];
    for (let index = 1; index < count && maximum > 0; index++) {
        const offset = Math.min(index * (slide + gap), maximum);
        const previous = offsets.at(-1) ?? 0;
        if (offset - previous > 0.5) offsets.push(offset);
        if (offset >= maximum) break;
    }
    return { offsets, visible };
}

export function nearestCarouselPage(offsets: readonly number[], position: number): number {
    let nearest = 0;
    let distance = Infinity;
    offsets.forEach((offset, index) => {
        if (Math.abs(position - offset) < distance) {
            nearest = index;
            distance = Math.abs(position - offset);
        }
    });
    return nearest;
}

export function boundedCarouselPage(index: number, count: number, rewind: boolean): number {
    if (count <= 1 || !Number.isFinite(index)) return 0;
    const integer = Math.trunc(index);
    return rewind ? ((integer % count) + count) % count : Math.max(0, Math.min(integer, count - 1));
}

/** Cycle offset for one original slide. It moves only after its previous instance is fully clipped. */
export function loopSlideShift(slideIndex: number, position: number, span: number, gap: number, count: number): number {
    if (span <= 0 || count <= 0) return 0;
    const cycle = span * count;
    return (Math.floor((position - slideIndex * span - (span - gap) + 0.01) / cycle) + 1) * cycle;
}

/** Closest cyclic destination; explicit next/prev across a boundary keeps its direction. */
export function loopDestination(requested: number, currentIndex: number, position: number, span: number, count: number): number {
    if (!Number.isFinite(requested) || span <= 0 || count <= 0) return 0;
    const logical = boundedCarouselPage(requested, count, true);
    const cycle = span * count;
    let target = logical * span + Math.round((position - logical * span) / cycle) * cycle;
    const phase = (position - currentIndex * span) / cycle;
    const settled = Math.abs(phase - Math.round(phase)) < 0.00001;
    if (settled && requested === currentIndex + 1 && target <= position + 0.01) target += cycle;
    if (settled && requested === currentIndex - 1 && target >= position - 0.01) target -= cycle;
    return target;
}
