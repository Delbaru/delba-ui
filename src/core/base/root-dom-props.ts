const ROOT_DATA_PROP_PREFIXES = ['data-order-', 'data-fancybox-', 'data-carousel-'] as const;
const ROOT_DATA_PROPS = new Set(['data-hide-scrollbar']);

export function splitRootDomProps<T extends Record<string, unknown>>(props: T): {
  rootProps: Partial<T>;
  elementProps: T;
} {
  const elementProps = { ...props };
  const rootProps: Partial<T> = {};

  for (const key of Object.keys(props)) {
    if (!ROOT_DATA_PROPS.has(key) && !ROOT_DATA_PROP_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    rootProps[key as keyof T] = props[key as keyof T];
    delete (elementProps as Record<string, unknown>)[key];
  }

  return { rootProps, elementProps };
}
