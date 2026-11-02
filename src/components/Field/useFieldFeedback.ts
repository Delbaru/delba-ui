import type { FieldMessage } from './FieldFrame/FieldFrame';

interface FieldFeedbackOptions {
  id: string;
  error?: string;
  comment?: string;
  placement: 'inside' | 'below';
  active: boolean;
  describedBy?: string;
  errorClassName?: string;
  paddingLeft?: FieldMessage['paddingLeft'];
}

/** Resolves message priority, visible placement and its actual accessible description. */
export function useFieldFeedback(options: FieldFeedbackOptions) {
  const { id, error, comment, placement, active, describedBy, errorClassName, paddingLeft } =
    options;
  const errorBelow = placement === 'below';
  const showInside = Boolean(error) && !errorBelow && !active;
  const showBelow = Boolean(error) && errorBelow;
  const showComment = !error && Boolean(comment);
  let messageId: string | undefined;

  if (showInside || showBelow) messageId = `${id}-error`;
  if (showComment) messageId = `${id}-comment`;

  return {
    describedBy: [describedBy, messageId].filter(Boolean).join(' ') || undefined,
    inline: { id: showInside ? messageId : undefined, text: showInside ? error : undefined },
    below: {
      error: {
        id: showBelow ? messageId : undefined,
        text: showBelow ? error : undefined,
        role: showBelow ? ('alert' as const) : undefined,
        color: 'var(--error)',
        className: errorClassName,
      },
      comment: {
        id: showComment ? messageId : undefined,
        text: showComment ? comment : undefined,
        color: 'var(--text-muted)',
        paddingLeft,
      },
    },
  };
}
