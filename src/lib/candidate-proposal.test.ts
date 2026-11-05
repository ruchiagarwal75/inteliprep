import { describe, expect, it } from "vitest";
import { isRequirementProposal } from "@/lib/candidate-proposal";

describe("explicit working-requirement proposals", () => {
  it.each([
    "I suggest keeping posts 1 year instead of 90 days.",
    "Let's keep posts for one year.",
    "I would keep posts for 365 days.",
    "I'd like to retain posts for one year.",
    "I’d prefer a one-year retention period.",
    "Can we retain posts for one year?",
    "Could we extend retention to one year?",
    "For retention, I'd keep posts for one year.",
    "How about one year retention instead?",
    "I will target p95 latency below 100 ms.",
    "The publish API stores a post. I propose one year retention.",
  ])("needs an explicit response: %s", (content) => {
    expect(isRequirementProposal(content)).toBe(true);
  });
  it.each([
    "I will add a worker that writes to Redis.",
    "I would use a cache to reduce read latency.",
    "I will store posts in the database and then return an acknowledgement.",
    "The retention cleanup deletes old rows each night.",
    "I've finished explaining. Let's discuss my design.",
    "Let's store posts in PostgreSQL and add an index on author ID.",
  ])("keeps ordinary narration quiet: %s", (content) => {
    expect(isRequirementProposal(content)).toBe(false);
  });
});
