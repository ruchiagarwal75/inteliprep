import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Saved-transcript checks only. No live suites, model mocks or credentials needed. */
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
    env: { OPENAI_KEY: "", OPENAI_TEST_KEY: "" },
    include: ["tests/audit/*.audit.ts"],
    maxWorkers: 1,
  },
});
