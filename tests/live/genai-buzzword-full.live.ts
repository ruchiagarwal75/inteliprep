import { it, vi } from "vitest";
import { runFullGenaiInterview } from "./full-genai-run";
vi.mock("@/lib/beta-config", async (original) => ({
  ...(await original<typeof import("@/lib/beta-config")>()),
  usesSharedStore: () => false,
}));
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("runs an adaptive buzzword Senior RAG interview with a simulated 45-minute clock", () =>
  runFullGenaiInterview("enterprise-rag-assistant", "buzzword"));
