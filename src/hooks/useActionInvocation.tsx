'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createActionAdmission } from './ActionAdmission';
import { isAbortActionError } from './action-invocation.model';

/** A result is never implicitly treated as an exception by the controller. */
export type ActionInvocationResult =
  | { status: 'success' }
  | { status: 'cancelled'; reason: unknown }
  | { status: 'failed'; error: unknown };

export interface ActionFailureContext { actionName?: string }
export type ActionFailureHandler = (error: unknown, context: ActionFailureContext) => void;
export type ActionCancellationPredicate = (error: unknown) => boolean;

interface ActionInvocationServices {
  failureRef: { current: ActionFailureHandler | undefined };
  cancelledRef: { current: ActionCancellationPredicate | undefined };
  scopeKey?: string | number;
  alive: { current: boolean };
  currentScope: { current: string | number | undefined };
  epoch: { current: number };
}

const InvocationContext = createContext<ActionInvocationServices | null>(null);
const admission = createActionAdmission();
const noPending = () => false;

/** A client session boundary owns errors; the kit never imports a CRM service. */
export function ActionInvocationProvider({
  children, onFailure, isCancelled, scopeKey,
}: {
  children: ReactNode;
  onFailure?: ActionFailureHandler;
  isCancelled?: ActionCancellationPredicate;
  /** Change on logout/account change to suppress stale cross-session delivery. */
  scopeKey?: string | number;
}) {
  const alive = useRef(false);
  const failureRef = useRef(onFailure);
  const cancelledRef = useRef(isCancelled);
  const currentScope = useRef(scopeKey);
  const epoch = useRef(0);
  useLayoutEffect(() => {
    failureRef.current = onFailure;
    cancelledRef.current = isCancelled;
    if (currentScope.current !== scopeKey) epoch.current++;
    currentScope.current = scopeKey;
  }, [onFailure, isCancelled, scopeKey]);
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  return (
    <InvocationContext.Provider value={{failureRef, cancelledRef, scopeKey, alive, currentScope, epoch}}>
      {children}
    </InvocationContext.Provider>
  );
}

export type ActionFunction<A extends readonly unknown[]> = (...args: A) => unknown;
export interface ActionInvocationOptions<A extends readonly unknown[]> {
  action?: ActionFunction<A>;
  onSettled?: (result: ActionInvocationResult) => void;
  actionName?: string;
  onSuccess?: () => void;
  /** Requests cancellation; the admission remains held until settlement. */
  onCancel?: () => void;
  /** Optional local identity (form/record) in addition to the provider scope. */
  identity?: string;
  /** Explicitly shared operation identity; remains held through unmount until settlement. */
  admissionKey?: string;
}
export interface ActionInvocationController<A extends readonly unknown[]> {
  pending: boolean;
  cancel?: () => boolean;
  /** Returns undefined for no action/reentry, otherwise a handled settlement. */
  invoke: (...args: A) => Promise<ActionInvocationResult> | undefined;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return value !== null && (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function';
}

/** One hook instance can be invoked from both keyboard and pointer triggers. */
export function useActionInvocation<A extends readonly unknown[] = []>({
  action, onSettled, actionName, identity, admissionKey, onSuccess, onCancel,
}: ActionInvocationOptions<A>): ActionInvocationController<A> {
  const services = useContext(InvocationContext);
  const onSettledRef = useRef(onSettled);
  const committed = useRef({ action, onSuccess, onCancel, actionName, services, admissionKey });
  const cancellation = useRef<(() => boolean) | null>(null);
  const mounted = useRef(false);
  const currentScope = useRef(services?.scopeKey);
  const currentProvider = useRef(services?.alive);
  const currentIdentity = useRef(identity);
  const currentAdmissionKey = useRef(admissionKey);
  const generation = useRef(0);
  const deliveryGeneration = useRef(0);
  const sequence = useRef(0);
  const activeTicket = useRef<number | null>(null);
  const [pending, setPending] = useState(false);

  const sharedKey = admissionKey === undefined ? undefined : JSON.stringify([services?.scopeKey, identity, admissionKey]);
  const subscribe = useCallback((listener: () => void) =>
    sharedKey === undefined ? () => {} : admission.subscribeKey(sharedKey, listener), [sharedKey]);
  const sharedPending = useSyncExternalStore(subscribe,
    () => sharedKey !== undefined && admission.pending(sharedKey), noPending);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useLayoutEffect(() => {
    onSettledRef.current = onSettled;
    committed.current = { action, onSuccess, onCancel, actionName, services, admissionKey };
    if (currentAdmissionKey.current !== admissionKey) {
      currentAdmissionKey.current = admissionKey;
      // Preserve the ticket through a form's room change, but never deliver its
      // local UI callbacks into another resource (even after changing back).
      deliveryGeneration.current++;
    }
    if (currentScope.current === services?.scopeKey && currentIdentity.current === identity &&
        currentProvider.current === services?.alive) return;
    currentScope.current = services?.scopeKey;
    currentProvider.current = services?.alive;
    currentIdentity.current = identity;
    // Only a committed identity change releases local ownership, not StrictMode effect replay.
    generation.current++;
    activeTicket.current = null;
    cancellation.current = null;
    setPending(false);
  }, [services, identity, onSettled, action, onSuccess, onCancel, actionName, admissionKey]);

  const invoke = (...args: A): Promise<ActionInvocationResult> | undefined => {
    const invocation = committed.current;
    if (!mounted.current || !invocation.action || invocation.admissionKey !== admissionKey || activeTicket.current !== null ||
        currentScope.current !== services?.scopeKey || currentIdentity.current !== identity ||
        currentProvider.current !== services?.alive) return undefined;
    if (services && (!services.alive.current || services.currentScope.current !== services.scopeKey)) return undefined;
    const release = sharedKey === undefined ? undefined : admission.acquire(sharedKey);
    if (sharedKey !== undefined && !release) return undefined;

    // Acquire before calling user code: even synchronous recursion cannot reenter.
    const ticket = ++sequence.current;
    activeTicket.current = ticket;
    const startedScope = currentScope.current;
    const startedIdentity = currentIdentity.current;
    const startedGeneration = generation.current;
    const startedDelivery = deliveryGeneration.current;
    const startedEpoch = invocation.services?.epoch.current;
    const currentSession = () => !invocation.services || (invocation.services.alive.current && invocation.services.epoch.current === startedEpoch && invocation.services.currentScope.current === startedScope);
    cancellation.current = invocation.onCancel ? () => {
      if (activeTicket.current !== ticket || startedDelivery !== deliveryGeneration.current || !currentSession()) return false;
      cancellation.current = null;
      try { invocation.onCancel?.(); return true; }
      catch (error) { console.error('UI action cancellation failed', error); return false; }
    } : null;
    const report = (error: unknown) => {
      if (startedGeneration !== generation.current || startedIdentity !== currentIdentity.current ||
          startedDelivery !== deliveryGeneration.current) return;
      if (!services) {
        console.error('Unhandled UI action failure', error);
        return;
      }
      if (!currentSession()) return;
      const handler = services.failureRef.current;
      if (!handler) {
        console.error('Unhandled UI action failure', error);
        return;
      }
      try { handler(error, { actionName: invocation.actionName }); }
      catch (reportError) { console.error('UI action error reporter failed', reportError); }
    };
    const classify = (error: unknown): ActionInvocationResult => {
      let cancelled = isAbortActionError(error);
      const predicate = currentSession() && startedGeneration === generation.current && startedDelivery === deliveryGeneration.current
        ? services?.cancelledRef.current : undefined;
      if (predicate) {
        try { cancelled = predicate(error) || cancelled; }
        catch (predicateError) { console.error('UI action cancellation predicate failed', predicateError); }
      }
      return cancelled ? { status: 'cancelled', reason: error } : { status: 'failed', error };
    };
    const settle = (result: ActionInvocationResult): ActionInvocationResult => {
      // Provider delivery intentionally survives child unmount, but NOT a session change.
      if (result.status === 'failed') report(result.error);
      if (mounted.current && activeTicket.current === ticket && startedGeneration === generation.current &&
          startedDelivery === deliveryGeneration.current && currentSession() && currentScope.current === startedScope && currentIdentity.current === startedIdentity) {
        if (result.status === 'success') {
          try { invocation.onSuccess?.(); }
          catch (error) { console.error('UI action success callback failed', error); }
        }
        try { onSettledRef.current?.(result); }
        catch (settlementError) { console.error('UI action settlement callback failed', settlementError); }
      }
      if (activeTicket.current === ticket) {
        activeTicket.current = null;
        cancellation.current = null;
        if (mounted.current) setPending(false);
      }
      release?.();
      return result;
    };

    let result: unknown;
    try {
      result = invocation.action(...args);
      if (!isThenable(result)) return Promise.resolve(settle({ status: 'success' }));
    } catch (error) {
      return Promise.resolve(settle(classify(error)));
    }

    setPending(true);
    return Promise.resolve(result).then(
      () => settle({ status: 'success' }),
      (error: unknown) => settle(classify(error)),
    );
  };

  const cancel = () => {
    if (!mounted.current || currentProvider.current !== services?.alive ||
        currentScope.current !== services?.scopeKey || currentIdentity.current !== identity ||
        currentAdmissionKey.current !== admissionKey) return false;
    return cancellation.current?.() ?? false;
  };
  return { pending: pending || sharedPending, invoke, cancel };
}
