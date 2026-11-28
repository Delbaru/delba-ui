import type { DisclosureConfiguration, DisclosureDefinition } from './Disclosure.types';

export function defineDisclosure(configuration: DisclosureConfiguration): DisclosureDefinition {
  return { ...configuration, token: Symbol('disclosure') };
}

export { DisclosureScope, useDisclosure, useDisclosureItem, type DisclosureController } from './Disclosure';
export type {
  DisclosureHeading,
  DisclosureItemProps,
  DisclosureMultipleProps,
  DisclosureProps,
  DisclosureSingleProps,
  DisclosureTriggerOptions,
} from './Disclosure.types';
