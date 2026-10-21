/** Pure validation helpers for browser fields and server-side form handlers. */
export const EMAIL_PATTERN = '[^\\s@]+@[^\\s@]+\\.[^\\s@]+';
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export * as phoneMask from './components/Input/lib/phone-mask';
