'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Transition, TransitionResult } from '../core';
import type { CollapseHandle, CollapseMotion } from './useCollapseMotion';
import { useCollapseState, type CollapseStateOptions } from './useCollapseState';

/** Управление поведением; обычный ref компонента по-прежнему указывает на его DOM-узел. */
export interface CollapseControls extends CollapseHandle {
    /** Состояние, принятое владельцем. */
    readonly open: boolean;
    /** Раскрыть и дождаться завершения перехода и обновления DOM. */
    show(): Promise<TransitionResult>;
    /** Скрыть и дождаться завершения перехода и обновления DOM. */
    hide(): Promise<TransitionResult>;
    /** Сменить состояние; повторный вызов учитывает ещё не отрисованную команду. */
    toggle(): Promise<TransitionResult>;
}

interface PendingRequest {
    open: boolean;
    promise: Promise<TransitionResult>;
    resolve: (result: TransitionResult) => void;
}

/** Состояние одно: собственное либо полученное от владельца. Команды не обходят controlled API. */
export function useCollapseControls(options: CollapseStateOptions) {
    const state = useCollapseState(options);
    const [, requestRender] = useState(0);
    const { open } = state;
    const pending = useRef<PendingRequest | null>(null);
    const active = useRef(true);
    const motion = useRef<CollapseMotion<HTMLElement> | null>(null);
    const latest = useRef({ ...options, currentOpen: open, changeOpen: state.changeOpen });
    latest.current = { ...options, currentOpen: open, changeOpen: state.changeOpen };

    function finish(status: TransitionResult['status']) {
        const request = pending.current;
        pending.current = null;
        request?.resolve({ status });
    }

    function request(next: boolean): Promise<TransitionResult> {
        if (!active.current) return Promise.resolve({ status: 'interrupted' });
        if (pending.current?.open === next) return pending.current.promise;
        const previousRequest = pending.current?.open;
        finish('interrupted');
        const state = latest.current;
        const lifecycle = motion.current;
        if (previousRequest === undefined && next === state.currentOpen && lifecycle && (next ? lifecycle.settled : !lifecycle.mounted)) {
            return Promise.resolve({ status: 'finished' });
        }
        if (state.open !== undefined && !state.onOpenChange) {
            return Promise.resolve({ status: 'interrupted' });
        }
        let resolveRequest: PendingRequest['resolve'] = () => {};
        const promise = new Promise<TransitionResult>((resolve) => {
            resolveRequest = resolve;
        });
        pending.current = { open: next, promise, resolve: resolveRequest };
        requestRender((revision) => revision + 1);
        if (next !== state.currentOpen || previousRequest !== undefined) state.changeOpen(next);
        return promise;
    }

    const requestRef = useRef(request);
    requestRef.current = request;
    const controls = useMemo<CollapseControls>(
        () => ({
            get open() {
                return latest.current.currentOpen;
            },
            get transition() {
                const lifecycle = motion.current;
                if (!lifecycle) throw new Error('Collapse controls are available after mounting.');
                return lifecycle.handle.transition;
            },
            show: () => requestRef.current(true),
            hide: () => requestRef.current(false),
            toggle: () => requestRef.current(!(pending.current?.open ?? latest.current.currentOpen)),
        }),
        [],
    );

    useLayoutEffect(() => {
        active.current = true;
        return () => {
            active.current = false;
            finish('interrupted');
        };
    }, []);

    // Layout-эффект запускается после эффектов движения: await разрешается уже с обновлённым DOM.
    function complete(lifecycle: CollapseMotion<HTMLElement>) {
        const target = pending.current?.open;
        if (target === undefined) return;
        if (target !== open) finish('interrupted');
        else if (target ? lifecycle.settled : !lifecycle.mounted) finish('finished');
    }

    function onTransition(transition: Transition) {
        transition.finished.then((result) => {
            // Команда может присоединиться к ходу, который раньше запустил controlled-владелец.
            // Отмена относится только к текущему ходу и принятой цели, а не к новому развороту.
            if (
                result.status === 'interrupted' &&
                motion.current?.handle.transition === transition &&
                pending.current?.open === latest.current.currentOpen
            )
                finish('interrupted');
        });
    }

    return { open, controls, motion, complete, onTransition };
}
