import { carouselTrackPosition, moveCarouselTrack } from '../../core/base/carousel-motion';
import { cubicBezier, type MotionEasingPreset } from '../../core/base/easing';
import { MEDIA_QUERY } from '../../core/base/breakpoints';
import { observeAnimationVisibility } from '../../core/base/animation-visibility';
import type { Transition } from '../../core/base/transition';
import { publishCarouselControlsSnapshot, resetCarouselControlsSnapshot } from '../Carousel/controls';
import { boundedCarouselPage, carouselGeometry, nearestCarouselPage, loopSlideShift, loopDestination } from './geometry';
import { connectCarousel, type NativeCarouselController, type NativeCarouselSnapshot } from './controller';
import { createPlaybackClock } from './playback';
import { createCarouselMotionProgress } from './motion-progress';
import { projectCarouselDrag, type ResolvedCarouselInertia } from './inertia';
import { configuredMotionEasing, motionDefaults, readMotionDefaultMs, readMotionDefaultNumber } from '../../core/base/motion-config';

export interface NativeCarouselOptions {
    count: number;
    initialIndex: number;
    duration: number;
    easing?: MotionEasingPreset;
    drag: boolean;
    rewind: boolean;
    loop: boolean;
    mousewheel: boolean;
    autoplay: boolean;
    delay: number;
    contentKey: string;
    pauseInactiveMedia: boolean;
    inertia: Omit<ResolvedCarouselInertia, 'maxSlides' | 'minimumVelocity'> & Partial<Pick<ResolvedCarouselInertia, 'maxSlides' | 'minimumVelocity'>>;
    onIndexChange?: (index: number) => void;
}

/** One instance per original slide, one position owner, no animation-frame loop while idle. */
export function createNativeCarousel(root: HTMLDivElement, viewport: HTMLDivElement, track: HTMLDivElement,
    controller: NativeCarouselController, readOptions: () => NativeCarouselOptions) {
    const view = root.ownerDocument.defaultView;
    if (!view) return { update() {}, destroy() {}, keyboard(_event: KeyboardEvent) {}, pointerDown(_event: PointerEvent) {} };
    const doc = root.ownerDocument;
    let geometry = carouselGeometry(0, 0, 0, 1);
    let index = readOptions().initialIndex;
    let position = 0;
    let move: Transition | null = null;
    let desiredPosition = 0;
    let motion: { from: number; to: number; duration: number; easing: MotionEasingPreset; progress: number;
        sampled: boolean; reversed: boolean; cancel: () => void } | null = null;
    let generation = 0;
    let destroyed = false;
    let playing = readOptions().autoplay;
    let autoplaySetting = playing;
    let size = 0;
    let gapPx = 0;
    let span = 0;
    let looping = false;
    let orientation: 'horizontal' | 'vertical' = 'horizontal';
    let explicitlyPaused = false;
    let hovered = false;
    let focused = false;
    let visible = !view.IntersectionObserver;
    let drag: { id: number; main: number; cross: number; position: number; active: boolean; started: number;
        samples: { time: number; point: number }[] } | null = null;
    let dragFrame = 0;
    let pendingPosition = 0;
    let suppressClick = false;
    let previousIndex = -1;
    let lastSnapshot = '';
    let contentKey = readOptions().contentKey;
    let shifts = new WeakMap<Element, number>();
    let slides = Array.from(track.children).filter((slide): slide is HTMLElement => slide instanceof view.HTMLElement);
    let arrangedBucket = NaN;
    let lastWheel = -Infinity;
    let wheelAttached = false;
    const tuning = { ...motionDefaults.carousel };
    let sampleDuration = 0;
    let minimumAutoplayDuration = 0;
    let minimumInertiaDuration = 0;
    let wheelCooldownDuration = 0;
    const reduced = view.matchMedia(MEDIA_QUERY.reducedMotion);
    const held = () => explicitlyPaused || hovered || focused || !visible || doc.hidden || reduced.matches || Boolean(drag);
    const wrappedIndex = (value: number) => boundedCarouselPage(value, readOptions().count, true);
    const nearest = (value: number) => looping ? wrappedIndex(Math.round(value / span)) : nearestCarouselPage(geometry.offsets, value);
    const transform = (value: number) => orientation === 'vertical' ? `translate3d(0,${value}px,0)` : `translate3d(${value}px,0,0)`;
    const positionRange = () => looping ? span * readOptions().count : geometry.offsets.at(-1) ?? 0;
    const fraction = (value: number) => {
        const range = positionRange();
        if (range <= 0) return 0;
        if (looping) return ((value % range) + range) % range / range;
        return Math.max(0, Math.min(1, value / range));
    };
    const arrange = (value: number) => {
        const bucket = looping && span > 0 ? Math.floor((value + gapPx + 0.01) / span) : 0;
        if (bucket === arrangedBucket) return;
        arrangedBucket = bucket;
        slides.forEach((slide, slideIndex) => {
            const shift = looping ? loopSlideShift(slideIndex, value, span, gapPx, readOptions().count) : 0;
            if (shifts.get(slide) === shift) return;
            shifts.set(slide, shift);
            if (shift) slide.style.transform = transform(shift);
            else slide.style.removeProperty('transform');
        });
    };
    const writePosition = (value: number) => {
        position = value;
        arrange(value);
        track.style.transform = transform(-value);
        if (!destroyed && motionProgress.subscriberCount) motionProgress.publish(fraction(value));
    };
    const settle = (value: number) => {
        const cycle = span * readOptions().count;
        const normalized = looping && cycle > 0 ? ((value % cycle) + cycle) % cycle : value;
        writePosition(normalized);
        desiredPosition = normalized;
    };
    const navigation = () => ({
        isBeginning: !looping && index === 0,
        isEnd: !looping && index >= geometry.offsets.length - 1,
        prevDisabled: geometry.offsets.length <= 1 || (!looping && !readOptions().rewind && index === 0),
        nextDisabled: geometry.offsets.length <= 1 || (!looping && !readOptions().rewind && index >= geometry.offsets.length - 1),
    });
    const updateSlideVisibility = (start: number) => {
        slides.forEach((slide, slideIndex) => {
            const shift = looping ? loopSlideShift(slideIndex, start, span, gapPx, readOptions().count) : 0;
            const left = slideIndex * span + shift;
            const hidden = left + span - gapPx <= start + 0.5 || left >= start + size - 0.5;
            if (!hidden) {
                slide.removeAttribute('aria-hidden');
                slide.removeAttribute('inert');
                return;
            }
            if (slide.contains(doc.activeElement)) root.focus({ preventScroll: true });
            slide.setAttribute('aria-hidden', 'true');
            slide.setAttribute('inert', '');
            if (readOptions().pauseInactiveMedia) {
                slide.querySelectorAll('video,audio').forEach(media => {
                    if (media instanceof view.HTMLMediaElement && !media.paused) media.pause();
                });
            }
        });
    };
    const publish = () => {
        if (destroyed) return;
        const state: NativeCarouselSnapshot = {
            index, pageCount: readOptions().count ? geometry.offsets.length : 0, slideCount: readOptions().count,
            looping, moving: Boolean(move), playing, paused: playing && held(), navigation: navigation(),
        };
        const signature = JSON.stringify(state);
        if (signature !== lastSnapshot) {
            lastSnapshot = signature;
            connection.publish(state);
            publishCarouselControlsSnapshot(root, {
                api: controller, navigationState: state.navigation, activeIndex: index, slideCount: state.slideCount,
                pageIndex: index, pageCount: state.pageCount, showNavigation: true, showDots: true,
            });
            updateSlideVisibility(move ? desiredPosition : position);
        }
        if (previousIndex !== index) { previousIndex = index; readOptions().onIndexChange?.(index); }
    };
    const clock = createPlaybackClock({
        now: () => view.performance.now(), setTimeout: (run, delay) => view.setTimeout(run, delay),
        clearTimeout: id => view.clearTimeout(id), requestAnimationFrame: run => view.requestAnimationFrame(run),
        cancelAnimationFrame: id => view.cancelAnimationFrame(id),
    }, () => { step(1); });
    const schedule = () => {
        publish();
        const end = !looping && !readOptions().rewind && index >= geometry.offsets.length - 1;
        clock.update({ delay: Math.max(minimumAutoplayDuration, readOptions().delay), playing,
            paused: held() || Boolean(move) || geometry.offsets.length <= 1 || end });
    };
    const interrupt = () => {
        if (!move) return 0;
        const current = carouselTrackPosition(track, orientation);
        let velocity = 0;
        if (motion?.sampled && motion.duration > 0) {
            const p = motion.progress;
            const lo = Math.max(0, p - 0.001);
            const hi = Math.min(1, p + 0.001);
            const slope = (motion.easing(hi) - motion.easing(lo)) / Math.max(0.0001, hi - lo);
            velocity = (motion.to - motion.from) / motion.duration * slope * (motion.reversed ? -1 : 1);
        }
        generation++;
        motion?.cancel();
        move = null;
        motion = null;
        writePosition(current);
        return velocity;
    };
    type MoveCommand = { direction?: -1 | 1; target?: number; duration?: number; velocity?: number };
    const destination = (requested: number, previous: number, command?: MoveCommand) => {
        if (command?.target !== undefined) return command.target;
        if (!looping) {
            const page = boundedCarouselPage(requested, geometry.offsets.length, readOptions().rewind);
            return geometry.offsets[page] ?? 0;
        }
        if (command?.direction) return previous + command.direction * span;
        return loopDestination(requested, index, position, span, readOptions().count);
    };
    const goTo = (requested: number, command?: MoveCommand): Transition => {
        const previousDestination = move ? desiredPosition : geometry.offsets[index] ?? position;
        const previousVelocity = interrupt();
        const target = destination(requested, previousDestination, command);
        index = looping ? wrappedIndex(requested) : boundedCarouselPage(requested, geometry.offsets.length, readOptions().rewind);
        desiredPosition = target;
        const from = position;
        let reversed = false;
        const token = ++generation;
        const duration = command?.duration ?? readOptions().duration;
        const velocity = command?.velocity ?? previousVelocity;
        const slope = Math.abs(target - from) > 0.5 ? velocity * duration / (target - from) : 0;
        // Retargeting constructs a bounded cubic with the incoming derivative; control points
        // are numerical constraints of that continuity calculation, not a second easing preset.
        const control = velocity * (target - from) < 0 ? 0.08 : 0.2;
        const easing = Math.abs(velocity) > 0.02 ? cubicBezier(control, Math.max(-0.35, Math.min(1, slope * control)), 0.4, 1)
            : readOptions().easing ?? configuredMotionEasing('carousel');
        arrange(from);
        const transition = moveCarouselTrack(track, from, target, duration, easing, orientation);
        clock.reset();
        if (Math.abs(target - from) < 0.5 || duration <= 0 || reduced.matches || !track.animate) {
            settle(target); schedule(); return transition;
        }
        const rawCancel = transition.cancel;
        const rawReverse = transition.reverse;
        move = transition;
        motion = { from, to: target, duration, easing, progress: 0, sampled: false, reversed: false, cancel: rawCancel };
        schedule();
        transition.on('progress', progress => {
            if (token !== generation || move !== transition || !motion) return;
            motion.progress = progress; motion.sampled = true;
            const current = from + (target - from) * easing(progress);
            if (looping) arrange(current);
            if (motionProgress.subscriberCount) motionProgress.publish(fraction(current));
        });
        // Keep the core Transition identity: together/sequence/at consult its private timing record.
        transition.cancel = () => {
                if (token !== generation || destroyed || move !== transition) return;
                interrupt(); index = nearest(position);
                settle(looping ? Math.round(position / span) * span : geometry.offsets[index] ?? 0);
                schedule();
        };
        transition.reverse = () => {
                if (token !== generation || destroyed || move !== transition) return;
                reversed = !reversed; rawReverse();
                if (motion) motion.reversed = reversed;
                desiredPosition = reversed ? from : target;
                index = nearest(desiredPosition); publish();
        };
        void transition.finished.then(outcome => {
            if (token !== generation || destroyed) return;
            move = null; motion = null;
            if (outcome.status === 'finished') settle(reversed ? from : target);
            else {
                const current = carouselTrackPosition(track, orientation);
                index = nearest(current);
                settle(looping ? Math.round(current / span) * span : geometry.offsets[index] ?? 0);
            }
            schedule();
        });
        return transition;
    };
    const step = (direction: -1 | 1) => goTo(index + direction, { direction });
    const motionProgress = createCarouselMotionProgress({
        read: () => fraction(move ? carouselTrackPosition(track, orientation) : position),
        seek(progress) {
            interrupt();
            const target = progress * positionRange();
            index = nearest(target); settle(target); clock.reset(); lastSnapshot = ''; schedule();
        },
    });
    const connection = connectCarousel(controller, {
        goTo, step, playback: clock, motionProgress,
        autoplay(command) {
            if (command === 'play') { playing = true; explicitlyPaused = false; }
            else if (command === 'pause') explicitlyPaused = true;
            else { playing = false; explicitlyPaused = false; }
            schedule();
        },
    });
    const update = () => {
        if (destroyed) return;
        sampleDuration = readMotionDefaultMs('carousel', 'dragSampleDuration', root);
        minimumAutoplayDuration = readMotionDefaultMs('carousel', 'autoplayMinimumDuration', root);
        minimumInertiaDuration = readMotionDefaultMs('carousel', 'inertiaMinimumDuration', root);
        wheelCooldownDuration = readMotionDefaultMs('carousel', 'wheelCooldownDuration', root);
        for (const key of ['dragThreshold', 'flickDistance', 'flickVelocity', 'edgeResistance', 'inertiaMaxSlides', 'inertiaMinimumVelocity'] as const)
            tuning[key] = readMotionDefaultNumber('carousel', key, root);
        const style = view.getComputedStyle(root);
        if (contentKey !== readOptions().contentKey) {
            contentKey = readOptions().contentKey; lastSnapshot = ''; arrangedBucket = NaN;
            slides = Array.from(track.children).filter((slide): slide is HTMLElement => slide instanceof view.HTMLElement);
        }
        const count = Number(style.getPropertyValue('--slides-per-view')) || 1;
        const gap = Number.parseFloat(style.gap) || 0;
        const nextOrientation = style.getPropertyValue('--native-carousel-axis').trim() === 'vertical' ? 'vertical' : 'horizontal';
        const nextSize = nextOrientation === 'vertical' ? viewport.clientHeight : viewport.clientWidth;
        const nextLoop = readOptions().loop && readOptions().count > Math.ceil(count) && nextSize > 0;
        const nextSpan = (nextSize - Math.max(0, count - 1) * gap) / count + gap;
        const finite = carouselGeometry(readOptions().count, nextSize, gap, count);
        const next = nextLoop ? { offsets: Array.from({ length: readOptions().count }, (_, item) => item * nextSpan), visible: count } : finite;
        const changed = nextSize !== size || nextSpan !== span || gap !== gapPx ||
            JSON.stringify(next) !== JSON.stringify(geometry) || nextOrientation !== orientation || looping !== nextLoop;
        if (autoplaySetting !== readOptions().autoplay) { autoplaySetting = readOptions().autoplay; playing = autoplaySetting; explicitlyPaused = false; }
        root.style.setProperty('--native-carousel-gap', `${gap}px`);
        if (changed) {
            interrupt();
            orientation = nextOrientation; looping = nextLoop; geometry = next; size = nextSize; gapPx = gap; span = nextSpan;
            shifts = new WeakMap();
            arrangedBucket = NaN;
            index = boundedCarouselPage(index, geometry.offsets.length, false);
            writePosition(geometry.offsets[index] ?? 0);
            desiredPosition = position;
            lastSnapshot = '';
        }
        root.dataset.orientation = orientation;
        arrange(position);
        root.dataset.looping = String(looping);
        if (wheelAttached !== readOptions().mousewheel) {
            wheelAttached = readOptions().mousewheel;
            if (wheelAttached) viewport.addEventListener('wheel', wheel, { passive: false });
            else viewport.removeEventListener('wheel', wheel);
        }
        schedule();
    };
    const interactive = (target: EventTarget | null) => target instanceof view.Element
        && Boolean(target.closest('button,input,textarea,select,a,video,audio,[contenteditable="true"],[data-carousel-no-drag]'));
    const mainCoordinate = (event: PointerEvent) => orientation === 'vertical' ? event.clientY : event.clientX;
    const crossCoordinate = (event: PointerEvent) => orientation === 'vertical' ? event.clientX : event.clientY;
    const dragPosition = (raw: number) => {
        if (looping) return raw;
        const maximum = geometry.offsets.at(-1) ?? 0;
        if (raw < 0) return raw * tuning.edgeResistance;
        if (raw > maximum) return maximum + (raw - maximum) * tuning.edgeResistance;
        return raw;
    };
    const flushDragFrame = () => {
        if (!dragFrame) return;
        view.cancelAnimationFrame(dragFrame);
        dragFrame = 0;
        writePosition(pendingPosition);
    };
    const down = (event: PointerEvent) => {
        suppressClick = false;
        if (event.defaultPrevented || !(event.target instanceof view.Node) || !viewport.contains(event.target)) return;
        if (!readOptions().drag || !event.isPrimary || event.button !== 0 || interactive(event.target) || geometry.offsets.length <= 1) return;
        const current = move ? carouselTrackPosition(track, orientation) : position;
        drag = { id: event.pointerId, main: mainCoordinate(event), cross: crossCoordinate(event), position: current, active: false, started: event.timeStamp,
            samples: [{ time: event.timeStamp, point: mainCoordinate(event) }] };
        schedule();
    };
    const pointerMove = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        let delta = mainCoordinate(event) - drag.main;
        const cross = crossCoordinate(event) - drag.cross;
        if (!drag.active) {
            if (Math.max(Math.abs(delta), Math.abs(cross)) < tuning.dragThreshold) return;
            if (Math.abs(cross) > Math.abs(delta)) {
                drag = null;
                schedule();
                return;
            }
            interrupt();
            drag.position = position;
            drag.main = mainCoordinate(event);
            delta = 0;
            drag.active = true;
            viewport.setPointerCapture(event.pointerId);
            root.dataset.dragging = 'true';
            // Native text selection may already have started below the drag threshold.
            // Clear only this carousel's selection; unrelated page selections remain intact.
            const selection = doc.getSelection();
            if (selection?.anchorNode && viewport.contains(selection.anchorNode)) selection.removeAllRanges();
        }
        event.preventDefault();
        drag.samples.push({ time: event.timeStamp, point: mainCoordinate(event) });
        while (drag.samples.length > 2 && (drag.samples[1]?.time ?? 0) < event.timeStamp - sampleDuration) drag.samples.shift();
        pendingPosition = dragPosition(drag.position - delta);
        if (!dragFrame) {
            dragFrame = view.requestAnimationFrame(() => {
                dragFrame = 0;
                writePosition(pendingPosition);
            });
        }
    };
    const finishDrag = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        const previous = drag;
        drag = null;
        flushDragFrame();
        root.dataset.dragging = 'false';
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        if (!previous.active) {
            schedule();
            return;
        }
        suppressClick = event.type === 'pointerup';
        const delta = mainCoordinate(event) - previous.main;
        const elapsed = Math.max(1, event.timeStamp - previous.started);
        const flick = event.type === 'pointerup' && Math.abs(delta) > tuning.flickDistance && Math.abs(delta) / elapsed * 1000 > tuning.flickVelocity;
        const sample = previous.samples[0];
        const velocity = sample ? (sample.point - mainCoordinate(event)) / Math.max(1, event.timeStamp - sample.time) : 0;
        const momentum = event.type === 'pointerup' && !reduced.matches
            ? projectCarouselDrag(position, velocity, span, {
                ...readOptions().inertia,
                maxSlides: readOptions().inertia.maxSlides ?? tuning.inertiaMaxSlides,
                minimumVelocity: readOptions().inertia.minimumVelocity ?? tuning.inertiaMinimumVelocity,
            }) : { position, duration: 0 };
        if (momentum.duration > 0) {
            const slot = Math.round(momentum.position / span);
            const targetIndex = looping ? wrappedIndex(slot) : nearestCarouselPage(geometry.offsets, momentum.position);
            const target = looping ? slot * span : geometry.offsets[targetIndex] ?? 0;
            // Cubic ease-out has initial slope 3; match release velocity, with a configured settling floor.
            const duration = Math.max(minimumInertiaDuration, Math.min(momentum.duration, 3 * Math.abs(target - position) / Math.max(0.01, Math.abs(velocity))));
            goTo(targetIndex, { target, duration, velocity });
        } else if (flick && !readOptions().inertia.enabled) {
            const slot = delta < 0 ? Math.ceil(position / span) : Math.floor(position / span);
            const targetIndex = looping ? wrappedIndex(slot) : nearestCarouselPage(geometry.offsets, slot * span);
            goTo(targetIndex, looping ? { target: slot * span } : undefined);
        }
        else goTo(nearest(position));
    };
    const lostCapture = (event: PointerEvent) => { if (event.target === viewport) finishDrag(event); };
    const click = (event: MouseEvent) => { if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopPropagation(); } };
    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } };
    const leave = () => { hovered = false; schedule(); };
    const focusIn = () => { focused = true; schedule(); };
    const focusOut = (event: FocusEvent) => { focused = event.relatedTarget instanceof view.Node && root.contains(event.relatedTarget); schedule(); };
    const keyboard = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || interactive(event.target)) return;
        const previous = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        let direction: -1 | 1 | null = null;
        if (event.key === previous) direction = -1;
        if (event.key === next) direction = 1;
        let target: number | null = null;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = geometry.offsets.length - 1;
        if (target === null && direction === null) return;
        event.preventDefault(); explicitlyPaused = true;
        if (direction) step(direction); else if (target !== null) goTo(target);
    };
    const wheel = (event: WheelEvent) => {
        if (!readOptions().mousewheel || event.defaultPrevented || event.ctrlKey || event.metaKey || interactive(event.target)) return;
        const delta = orientation === 'vertical' ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta || geometry.offsets.length <= 1) return;
        const state = navigation();
        if ((delta > 0 && state.nextDisabled) || (delta < 0 && state.prevDisabled)) return;
        event.preventDefault();
        if (event.timeStamp - lastWheel < Math.max(wheelCooldownDuration, readOptions().duration)) return;
        lastWheel = event.timeStamp; explicitlyPaused = true; step(delta > 0 ? 1 : -1);
    };
    const visibility = () => schedule();
    const resize = new view.ResizeObserver(update);
    resize.observe(viewport);
    const stopVisibility = observeAnimationVisibility(root, next => { visible = next; schedule(); }, '0px');
    root.dataset.carouselReady = 'true'; viewport.scrollLeft = 0; viewport.scrollTop = 0;
    viewport.addEventListener('pointermove', pointerMove, { passive: false });
    viewport.addEventListener('lostpointercapture', lostCapture);
    view.addEventListener('pointerup', finishDrag); view.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('click', click, true);
    root.addEventListener('pointerenter', enter); root.addEventListener('pointerleave', leave);
    root.addEventListener('focusin', focusIn); root.addEventListener('focusout', focusOut);
    reduced.addEventListener('change', visibility); view.addEventListener('resize', update);
    update();
    return {
        update, keyboard, pointerDown: down,
        destroy() {
            destroyed = true; clock.destroy(); interrupt();
            const pointer = drag?.id;
            drag = null;
            if (dragFrame) view.cancelAnimationFrame(dragFrame);
            if (pointer !== undefined && viewport.hasPointerCapture(pointer)) viewport.releasePointerCapture(pointer);
            resize.disconnect(); stopVisibility();
            viewport.removeEventListener('pointermove', pointerMove); viewport.removeEventListener('lostpointercapture', lostCapture);
            viewport.removeEventListener('wheel', wheel);
            view.removeEventListener('pointerup', finishDrag); view.removeEventListener('pointercancel', finishDrag);
            viewport.removeEventListener('click', click, true);
            root.removeEventListener('pointerenter', enter); root.removeEventListener('pointerleave', leave);
            root.removeEventListener('focusin', focusIn); root.removeEventListener('focusout', focusOut);
            reduced.removeEventListener('change', visibility); view.removeEventListener('resize', update);
            delete root.dataset.carouselReady; delete root.dataset.looping; delete root.dataset.orientation;
            delete root.dataset.dragging;
            track.style.removeProperty('transform');
            slides.forEach(slide => {
                slide.removeAttribute('inert'); slide.removeAttribute('aria-hidden');
                if (slide instanceof view.HTMLElement) slide.style.removeProperty('transform');
            });
            root.style.removeProperty('--native-carousel-gap'); resetCarouselControlsSnapshot(root); connection.disconnect();
        },
    };
}
