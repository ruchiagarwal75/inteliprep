import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Explicit opt-in: real provider, no tests/setup auth or network stubs.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/live/*.live.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 1_200_000,
    hookTimeout: 1_200_000,
  },
});
