/** Also cancels test/proxy fetches and streams that do not honor AbortSignal. */
export function abortable<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const cancel = () =>
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", cancel));
  });
}
