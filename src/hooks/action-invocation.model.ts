/** No CRM dependency: web/native aborts are recognised by their public name. */
export function isAbortActionError(error: unknown): boolean {
  return error !== null && typeof error === 'object' &&
    'name' in error && (error as { name: unknown }).name === 'AbortError';
}
