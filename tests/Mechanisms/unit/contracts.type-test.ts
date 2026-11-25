import { ui } from '../../../src/ui';
import type {
  ActionOptions,
  AsyncOptions,
  CollapseDoorOptions,
  CollectionDefinition,
  CollectionOptions,
  FormOptions,
  PopupOptions,
  ScrollOptions,
} from '../../../src';

type Item = { id: string; label: string };
declare const definition: CollectionDefinition<Item>;
declare const items: readonly Item[];

/** The two-argument collection contract remains usable for stable owner scopes. */
export const useStableCollection = () => ui.collection.use(definition, items);
export const collectionOptions: CollectionOptions = { mode: 'multiple', retainMissing: true };
export const popupOptions: PopupOptions = {
  preset: 'context',
  label: 'Item actions',
  children: null,
};
export const collapseOptions: CollapseDoorOptions = {
  defaultOpen: false,
  gap: [4, 8, 12],
};
export const scrollOptions: ScrollOptions = {
  preset: 'feed',
  height: { min: [120, 160, 200], max: [240, 280, 320] },
  width: { min: [240, 320, 400], max: [640, 720, 800] },
  p: { top: [4, 8, 12], right: 8 },
};
export const asyncOptions: AsyncOptions<Item> = {
  preset: 'default',
  from: { data: { id: 'one', label: 'One' } },
  timing: { delay: 100, hide: 150 },
};
export const actionOptions: ActionOptions = {
  preset: 'default',
  run: async () => undefined,
};
export const formOptions: FormOptions<{ text: string }, void> = {
  scope: 'mechanism-type-contract',
  preset: 'default',
  initial: { text: '' },
  submit: () => undefined,
};
export type MechanismHookContracts = [
  typeof ui.collection.use,
  typeof ui.popup,
  typeof ui.collapse.use,
  typeof ui.scroll.feed.use,
  typeof ui.async.use,
  typeof ui.action.use,
  typeof ui.form.use,
];
