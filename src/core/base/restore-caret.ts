export interface CaretRestoreRequest {
  input: HTMLInputElement | HTMLTextAreaElement;
  displayValue: string;
  selectionStart: number;
  selectionEnd: number;
  direction: HTMLInputElement['selectionDirection'];
}

/** Schedules a selection restore in the input's own document and returns its cancellation. */
export function scheduleCaretRestore(
  request: CaretRestoreRequest,
  isCurrent: () => boolean,
): () => void {
  const { input, displayValue, selectionStart, selectionEnd, direction } = request;
  const view = input.ownerDocument.defaultView;
  if (!view) return () => undefined;

  const frame = view.requestAnimationFrame(() => {
    if (!isCurrent() || !input.isConnected || input.value !== displayValue) return;
    input.setSelectionRange(selectionStart, selectionEnd, direction ?? 'none');
  });

  return () => view.cancelAnimationFrame(frame);
}
