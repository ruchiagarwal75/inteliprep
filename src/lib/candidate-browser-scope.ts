import { createInterviewStorage } from "@/lib/interview-storage";

/** Captured identity and cancellation prevent old callbacks adopting a new account. */
export function createCandidateBrowserScope(
  userId: string,
  onUnauthorized?: () => void,
) {
  const storage = createInterviewStorage(userId);
  const abort = new AbortController();
  let mountVersion = 0;
  const deactivate = () => {
    abort.abort();
    storage.deactivate();
  };
  const request: typeof fetch = async (input, init) => {
    abort.signal.throwIfAborted();
    const headers = new Headers(init?.headers);
    headers.set("X-Interview-Account", userId);
    const response = await fetch(input, {
      ...init,
      headers,
      signal: init?.signal
        ? AbortSignal.any([abort.signal, init.signal])
        : abort.signal,
    });
    abort.signal.throwIfAborted();
    if (response.status === 401 || response.status === 403) {
      deactivate();
      onUnauthorized?.();
    }
    return response;
  };
  return {
    storage,
    request,
    deactivate,
    attach() {
      const version = ++mountVersion;
      return () =>
        queueMicrotask(() => {
          // A Strict Mode replay attaches again synchronously before this runs.
          if (mountVersion === version) deactivate();
        });
    },
  };
}
