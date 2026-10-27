/** IntersectionObserver accepts one to four pixel/percentage margins, including negative ones. */
export function isVisibilityMargin(value: unknown): value is string {
  return typeof value === 'string' && /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)(?:\s+-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)){0,3}$/.test(value.trim());
}

/** Configured preparation area for continuous motion; independent of appearance observers. */
export function animationVisibilityMargin(node: Element): string {
  const value = getComputedStyle(node).getPropertyValue('--t-m-visibility-root-margin').trim();
  return isVisibilityMargin(value) ? value : '100px';
}
