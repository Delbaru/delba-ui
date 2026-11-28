import { ui } from '#ui';
import { ACCORDION_ITEM_DEFAULTS } from './AccordionItem/AccordionItem.config';

export const accordion = ui.disclosure.define({
  defaults: {
    dir: ['column', 'column', 'column'],
    headingAs: 'h3',
    collapsible: true,
    item: ACCORDION_ITEM_DEFAULTS,
  },
  navigation: { axis: 'vertical', loop: true },
});
