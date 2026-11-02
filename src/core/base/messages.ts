import { MESSAGES_CONFIG } from '../messages-config';
import { resolveUiMessages } from './message-defaults';

export { formatUiMessage } from './message-defaults';
export type { UiMessages, UiMessageOverrides } from './message-defaults';

/** Build-time ui.config messages shared by SSR and client rendering. */
export const UI_MESSAGES = resolveUiMessages(MESSAGES_CONFIG);
