import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Resolves the "@/*" -> "src/*" paths from tsconfig.json natively.
  resolve: {
    tsconfigPaths: true,
    // Unit tests execute server modules in Node; Next enforces the client boundary.
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
    // Logic tests run in Node. Component tests would need jsdom plus
    // @testing-library/react; add those when the first component needs one.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
