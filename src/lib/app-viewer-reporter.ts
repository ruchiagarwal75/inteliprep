/** Client identity is only a resend hint. The endpoint verifies the account from cookies. */
export function createAppViewerReporter(
  identify: (create: boolean) => Promise<string | undefined>,
  send: (id: string) => Promise<boolean>,
) {
  const completed = new Set<string>();
  const pending = new Set<string>();
  return async (entry: boolean, accountId?: string) => {
    if (!entry && !accountId) return;
    const id = await identify(entry);
    if (!id) return;
    const key = `${id}:${accountId ?? "anonymous"}`;
    if (completed.has(key) || pending.has(key)) return;
    pending.add(key);
    try {
      if (await send(id)) completed.add(key);
    } finally {
      pending.delete(key);
    }
  };
}
