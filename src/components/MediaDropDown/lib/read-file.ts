export function readFileAsDataUrl(file: File, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();

    reader.onload = () => {
      signal.removeEventListener('abort', abort);
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read media file'));
    };
    reader.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(reader.error ?? new Error('Unable to read media file'));
    };
    reader.onabort = () => {
      signal.removeEventListener('abort', abort);
      reject(new DOMException('Media read canceled', 'AbortError'));
    };
    if (signal.aborted) {
      reject(new DOMException('Media read canceled', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    reader.readAsDataURL(file);
  });
}
