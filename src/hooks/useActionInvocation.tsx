'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
}

const InvocationContext = createContext<ActionInvocationServices | null>(null);

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
  failureRef.current = onFailure;
  cancelledRef.current = isCancelled;
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  return (
    <InvocationContext.Provider value={{failureRef, cancelledRef, scopeKey, alive, currentScope}}>
      {children}
    </InvocationContext.Provider>
  );
}

export type ActionFunction<A extends readonly unknown[]> = (...args: A) => unknown;
export interface ActionInvocationOptions<A extends readonly unknown[]> {
  action?: ActionFunction<A>;
  onSettled?: (result: ActionInvocationResult) => void;
  actionName?: string;
  /** Optional local identity (form/record) in addition to the provider scope. */
  identity?: string;
}
export interface ActionInvocationController<A extends readonly unknown[]> {
  pending: boolean;
  /** Returns undefined for no action/reentry, otherwise a handled settlement. */
  invoke: (...args: A) => Promise<ActionInvocationResult> | undefined;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return value !== null && (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function';
}

/** One hook instance can be invoked from both keyboard and pointer triggers. */
export function useActionInvocation<A extends readonly unknown[] = []>({
  action, onSettled, actionName, identity,
}: ActionInvocationOptions<A>): ActionInvocationController<A> {
  const services = useContext(InvocationContext);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const mounted = useRef(false);
  const currentScope = useRef(services?.scopeKey);
  currentScope.current = services?.scopeKey;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const sequence = useRef(0);
  const activeTicket = useRef<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // A new session may start new actions; old settlements have no local owner.
    sequence.current += 1;
    activeTicket.current = null;
    setPending(false);
  }, [services?.scopeKey, identity]);

  const invoke = (...args: A): Promise<ActionInvocationResult> | undefined => {
    if (!action || activeTicket.current !== null) return undefined;

    // Acquire before calling user code: even synchronous recursion cannot reenter.
    const ticket = ++sequence.current;
    activeTicket.current = ticket;
    const startedScope = currentScope.current;
    const startedIdentity = currentIdentity.current;
    const report = (error: unknown) => {
      if (startedIdentity !== currentIdentity.current) return;
      if (!services) {
        console.error('Unhandled UI action failure', error);
        return;
      }
      if (!services.alive.current || services.currentScope.current !== startedScope) return;
      const handler = services.failureRef.current;
      if (!handler) {
        console.error('Unhandled UI action failure', error);
        return;
      }
      try { handler(error, { actionName }); }
      catch (reportError) { console.error('UI action error reporter failed', reportError); }
    };
    const classify = (error: unknown): ActionInvocationResult => {
      let cancelled = isAbortActionError(error);
      const predicate = services?.cancelledRef.current;
      if (predicate) {
        try { cancelled = predicate(error) || cancelled; }
        catch (predicateError) { console.error('UI action cancellation predicate failed', predicateError); }
      }
      return cancelled ? { status: 'cancelled', reason: error } : { status: 'failed', error };
    };
    const settle = (result: ActionInvocationResult): ActionInvocationResult => {
      // Provider delivery intentionally survives child unmount, but NOT a session change.
      if (result.status === 'failed') report(result.error);
      if (mounted.current && activeTicket.current === ticket && currentScope.current === startedScope && currentIdentity.current === startedIdentity) {
        try { onSettledRef.current?.(result); }
        catch (settlementError) { console.error('UI action settlement callback failed', settlementError); }
      }
      if (activeTicket.current === ticket) {
        activeTicket.current = null;
        if (mounted.current) setPending(false);
      }
      return result;
    };

    let result: unknown;
    try {
      result = action(...args);
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

  return { pending, invoke };
}
