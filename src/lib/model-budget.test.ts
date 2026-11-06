import { expect, it } from "vitest";
import {
  boundedModelMessages,
  MAX_MODEL_HISTORY_BYTES,
} from "@/lib/model-budget";
import { boundedModelRequest } from "@/lib/model-request";
it("bounds multibyte history while retaining the opening and complete latest message", () => {
  const opening = { role: "assistant" as const, content: "Configured opening" };
  const messages = [
    opening,
    ...Array.from({ length: 40 }, (_, i) => ({
      role: "user" as const,
      content: String(i) + "界".repeat(2_000),
    })),
  ];
  const bounded = boundedModelMessages(messages);
  expect(Buffer.byteLength(JSON.stringify(bounded))).toBeLessThanOrEqual(
    MAX_MODEL_HISTORY_BYTES,
  );
  expect(bounded[0]).toEqual(opening);
  expect(bounded.at(-1)).toEqual(messages.at(-1));
  expect(bounded.length).toBeLessThan(messages.length);
});
it("rejects oversized provider text including instructions before any API call", () => {
  expect(() =>
    boundedModelRequest({
      model: "test",
      instructions: "x".repeat(128_001),
      input: "small",
    }),
  ).toThrow("context limit");
  expect(() =>
    boundedModelRequest({ model: "test", input: "界".repeat(60_000) }),
  ).toThrow("context limit");
});
