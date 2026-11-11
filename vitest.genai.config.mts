import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Explicit opt-in: real provider using a required test-only key, never the app key.
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
    env: { OPENAI_KEY: "" },
    setupFiles: ["./tests/live/setup.ts"],
    include: ["tests/live/*.live.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 1_200_000,
    hookTimeout: 1_200_000,
  },
});
