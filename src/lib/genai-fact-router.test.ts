import { expect, it, vi } from "vitest";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import {
  classifyGenaiFacts,
  genaiClarification,
} from "@/lib/genai-fact-router";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const result = (factIds: string[], hasUnspecified = false) => ({
  status: "completed",
  output_text: JSON.stringify({ intent: "facts", factIds, hasUnspecified }),
});
it("sends only semantic fact definitions, never values, anchors or a reference design", async () => {
  model.mockResolvedValueOnce(result(["employees"]));
  await classifyGenaiFacts(genaiEngineFixture(), "Company size?");
  const body = JSON.stringify(model.mock.lastCall);
  expect(body).toContain("Number of employees");
  expect(body).not.toMatch(/There are|PRIVATE_|20,000|50M/);
  expect(model.mock.lastCall?.[1].text.format).toMatchObject({
    type: "json_schema",
    strict: true,
  });
});
it("returns every selected value once, in selection order", async () => {
  model.mockResolvedValueOnce(result(["docs", "employees", "docs"]));
  const answer = await genaiClarification(genaiEngineFixture(), "senior", [
    { role: "user", content: "Company and corpus?" },
  ]);
  expect(answer?.text).toBe(
    "There are 5M documents.\n\nThere are 20,000 employees.",
  );
});
it("gives an explicit assumption invitation when no fact matches", async () => {
  model.mockResolvedValueOnce(result([]));
  expect(
    (
      await genaiClarification(genaiEngineFixture(), "senior", [
        { role: "user", content: "What is the unspecified budget?" },
      ])
    )?.text,
  ).toBe("That detail isn't specified. What would you assume?");
});
it("answers known parts and acknowledges an unspecified part", async () => {
  model.mockResolvedValueOnce(result(["employees"], true));
  const answer = await genaiClarification(genaiEngineFixture(), "mid", [
    { role: "user", content: "Users and budget?" },
  ]);
  expect(answer?.text).toContain("2,000 employees");
  expect(answer?.text).toContain("isn't specified");
});
it("does not invent values or silently accept malformed IDs on provider failure", async () => {
  model.mockResolvedValueOnce(result(["not-in-config"]));
  await expect(
    classifyGenaiFacts(genaiEngineFixture(), "User count?"),
  ).rejects.toThrow();
  model.mockResolvedValueOnce({ status: "incomplete" });
  await expect(
    classifyGenaiFacts(genaiEngineFixture(), "User count?"),
  ).rejects.toThrow();
});
it("lets design answers use the discussion path", async () => {
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      intent: "other",
      factIds: [],
      hasUnspecified: false,
    }),
  });
  expect(
    await genaiClarification(genaiEngineFixture(), "senior", [
      { role: "user", content: "I use a cache." },
    ]),
  ).toBeUndefined();
});
