import { APIConnectionTimeoutError } from "openai";
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
  model.mockResolvedValueOnce(result(["mmq7-employees"]));
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
  model.mockResolvedValueOnce(
    result(["mmq7-docs", "mmq7-employees", "mmq7-docs"]),
  );
  const answer = await genaiClarification(genaiEngineFixture(), "senior", [
    { role: "user", content: "Company and corpus?" },
  ]);
  expect(answer?.text).toBe(
    "There are 5M documents.\n\nThere are 20,000 employees.",
  );
});
it("returns only the new fact after earlier facts were already supplied", async () => {
  model.mockResolvedValueOnce(result(["mmq7-employees", "mmq7-docs"]));
  const answer = await genaiClarification(genaiEngineFixture(), "senior", [
    { role: "user", content: "How many people will use it?" },
    { role: "assistant", content: "There are 20,000 employees." },
    { role: "user", content: "What's the size of the corpus?" },
  ]);
  expect(answer?.text).toBe("There are 5M documents.");
  expect(answer?.text).not.toMatch(/20,000|confirm/iu);
});
it("keeps a useful invitation when every selected fact is already known", async () => {
  model.mockResolvedValueOnce(result(["mmq7-employees"]));
  const answer = await genaiClarification(genaiEngineFixture(), "senior", [
    { role: "assistant", content: "To confirm, there are 20,000 employees." },
    { role: "user", content: "How many employees?" },
  ]);
  expect(answer?.text).toMatch(/requirement/iu);
  expect(answer?.text).not.toMatch(/20,000|confirm/iu);
});
it("gives an explicit assumption invitation when no fact matches", async () => {
  model.mockResolvedValueOnce(result([], true));
  expect(
    (
      await genaiClarification(genaiEngineFixture(), "senior", [
        { role: "user", content: "What is the unspecified budget?" },
      ])
    )?.text,
  ).toBe("That detail isn't specified. What would you assume?");
});
it("answers known parts and acknowledges an unspecified part", async () => {
  model.mockResolvedValueOnce(result(["mmq7-employees"], true));
  const answer = await genaiClarification(genaiEngineFixture(), "mid", [
    { role: "user", content: "Users and budget?" },
  ]);
  expect(answer?.text).toContain("2,000 employees");
  expect(answer?.text).toContain("isn't specified");
});
it("does not invent values for malformed IDs or incomplete provider output", async () => {
  model
    .mockResolvedValueOnce(result(["mmq7-not-in-config"]))
    .mockResolvedValueOnce(result(["mmq7-not-in-config"]));
  expect(
    (await classifyGenaiFacts(genaiEngineFixture(), "User count?")).intent,
  ).toBe("rephrase");
  model
    .mockResolvedValueOnce({ status: "incomplete" })
    .mockResolvedValueOnce({ status: "incomplete" });
  expect(
    (await classifyGenaiFacts(genaiEngineFixture(), "User count?")).intent,
  ).toBe("rephrase");
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

it("keeps general requests separate from a specific unspecified value", async () => {
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      intent: "general",
      factIds: [],
      hasUnspecified: false,
    }),
  });
  const answer = await genaiClarification(genaiEngineFixture(), "senior", [
    { role: "user", content: "What else should I know?" },
  ]);
  expect(answer?.text).toBe(
    "What would you like to know? You can ask about any requirement.",
  );
  expect(answer?.text).not.toMatch(/specified|traffic|latency|permissions/iu);
  model.mockResolvedValueOnce(result([]));
  expect(
    (
      await genaiClarification(genaiEngineFixture(), "senior", [
        { role: "user", content: "What else should I know?" },
      ])
    )?.text,
  ).not.toContain("isn't specified");
});

it("retries a classifier timeout once and returns the successful fact", async () => {
  const before = model.mock.calls.length;
  model
    .mockRejectedValueOnce(new APIConnectionTimeoutError())
    .mockResolvedValueOnce(result(["mmq7-employees"]));
  expect(
    (
      await genaiClarification(genaiEngineFixture(), "senior", [
        { role: "user", content: "Users?" },
      ])
    )?.text,
  ).toBe("There are 20,000 employees.");
  expect(model.mock.calls.length - before).toBe(2);
  expect(model.mock.lastCall?.[2]).toMatchObject({ maxRetries: 0 });
});
it("returns a friendly rephrase after two classifier errors", async () => {
  const before = model.mock.calls.length;
  model
    .mockRejectedValueOnce(new Error("Network"))
    .mockRejectedValueOnce(new Error("Network"));
  expect(
    (
      await genaiClarification(genaiEngineFixture(), "senior", [
        { role: "user", content: "Users?" },
      ])
    )?.text,
  ).toBe("Could you rephrase that?");
  expect(model.mock.calls.length - before).toBe(2);
});
it("drops fact IDs on a non-fact intent mismatch", async () => {
  for (const factIds of [["employees"], ["not-a-real-fact"]]) {
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        intent: "other",
        factIds,
        hasUnspecified: true,
      }),
    });
    expect(
      await classifyGenaiFacts(genaiEngineFixture(), "I use an API."),
    ).toMatchObject({ intent: "other", factIds: [], hasUnspecified: false });
  }
});
it("does not retry a cancelled user request", async () => {
  const before = model.mock.calls.length;
  await expect(
    classifyGenaiFacts(genaiEngineFixture(), "Users?", AbortSignal.abort()),
  ).rejects.toThrow();
  expect(model.mock.calls.length - before).toBe(0);
});
