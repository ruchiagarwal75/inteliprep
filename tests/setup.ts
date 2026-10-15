import { beforeEach } from "vitest";

// Each test starts with fresh local quotas; individual tests can exercise exhaustion.
beforeEach(() => {
  const state = globalThis as typeof globalThis & {
    inteliprepRequestCounters?: Map<string, unknown>;
  };
  state.inteliprepRequestCounters?.clear();
});
