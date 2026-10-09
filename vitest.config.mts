import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/*" -> "src/*" paths from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
  test: {
    // Logic tests run in Node. Component tests would need jsdom plus
    // @testing-library/react; add those when the first component needs one.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
