import { usePopup } from './core/Popup/Popup';
import { useAsync } from './core/Async/Async';
import { useActionInvocation } from './hooks/useActionInvocation';
import { useForm, useFormField } from './core/Form';
import { useFeedScroll } from './core/Scroll';
import { useCollapse } from './core/Collapse/Collapse';
import { defineCollection, useCollection, useCollectionItem, useCollectionCheck } from './core/Collection';
import { defineDisclosure, useDisclosure, useDisclosureItem } from '#core/Disclosure';
import { useElement } from '#core/Element';
import { useNavigation } from '#core/Navigation';
import { calendar, useCalendar } from '#core/Calendar';
import { useScopedSmoothScroll } from '#core/Scroll/Smooth';

/** Shared UI mechanisms; product owners supply their own commands and scopes. */
export const ui = {
  popup: { use: usePopup },
  async: { use: useAsync },
  form: { use: useForm, field: { use: useFormField } },
  action: { use: useActionInvocation },
  collection: { define: defineCollection, use: useCollection, item: { use: useCollectionItem }, check: { use: useCollectionCheck } },
  calendar: { ...calendar, use: useCalendar },
  scroll: {
    feed: { use: useFeedScroll },
    smooth: { use: useScopedSmoothScroll },
  },
  collapse: { use: useCollapse },
  disclosure: { define: defineDisclosure, use: useDisclosure, item: { use: useDisclosureItem } },
  navigation: { use: useNavigation },
  element: { use: useElement },
};
