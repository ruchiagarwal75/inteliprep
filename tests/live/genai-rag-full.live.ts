import { it, vi } from "vitest";
import { runFullGenaiInterview } from "./full-genai-run";
vi.mock("@/lib/beta-config", async (original) => ({
  ...(await original<typeof import("@/lib/beta-config")>()),
  usesSharedStore: () => false,
}));
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("runs a complete Senior enterprise-rag-assistant interview through a simulated 45 minutes", () =>
  runFullGenaiInterview("enterprise-rag-assistant"));
