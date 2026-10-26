import { describe, expect, it, vi } from "vitest";
vi.unmock("@/lib/candidate-context");
import {
  currentCandidateId,
  withCandidateIdentity,
} from "@/lib/candidate-context";
describe("request account context", () => {
  it("has no global candidate identity outside an authenticated request", () => {
    expect(currentCandidateId()).toBeUndefined();
  });
  it("keeps concurrent asynchronous requests and their callbacks separate", async () => {
    await Promise.all(
      ["alice", "bob"].map((id) =>
        withCandidateIdentity(id, async () => {
          expect(currentCandidateId()).toBe(id);
          await new Promise((resolve) => setTimeout(resolve, 1));
          expect(currentCandidateId()).toBe(id);
        }),
      ),
    );
    expect(currentCandidateId()).toBeUndefined();
  });
});
