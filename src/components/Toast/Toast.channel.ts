import type { ToastApi, ToastOptions } from './Toast.types';

/** Providers own queues. This registry only routes a command to one mounted host. */
export function createToastChannel() {
  const hosts = new WeakMap<object, { api: ToastApi }[]>();

  function register(host: object, api: ToastApi) {
    const entry = { api };
    const stack = hosts.get(host) ?? [];
    hosts.set(host, [...stack, entry]);
    return () => {
      const remaining = hosts.get(host)?.filter(item => item !== entry) ?? [];
      if (remaining.length) hosts.set(host, remaining);
      else hosts.delete(host);
    };
  }

  function send(host: object, options: ToastOptions): boolean {
    const destination = hosts.get(host)?.at(-1);
    if (!destination) return false;
    destination.api.show(options);
    return true;
  }

  return { register, send };
}

export const toastChannel = createToastChannel();

/** Notify the most recently mounted provider in this document. False means no mounted host (including SSR). */
export function toast(options: ToastOptions): boolean {
  if (typeof document === 'undefined') return false;
  return toastChannel.send(document, options);
}
