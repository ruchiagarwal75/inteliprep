import { expect, it } from "vitest";
import { APIError } from "openai";
import { z } from "zod";
import { PlayGradingError, playFailureDetails } from "./grading-error";
it("classifies provider authentication without exposing its message", () => {
  const provider = new APIError(
    401,
    { code: "expired_secret_key", message: "secret-key and private answer" },
    "private provider message",
    new Headers(),
  );
  const details = playFailureDetails(
    new PlayGradingError("provider", provider),
  );
  expect(details.fields).toEqual({
    playGradingStage: "provider",
    kind: "play:provider_authentication",
    providerCode: "expired_secret_key",
  });
  expect(JSON.stringify(details.fields)).not.toMatch(/private|secret-key/);
  expect(new PlayGradingError("provider", provider).message).not.toContain(
    "401",
  );
});
it("drops unknown provider codes and logs only a validation count", () => {
  const provider = new APIError(
    400,
    { code: "private-answer-in-code" },
    "private",
    new Headers(),
  );
  expect(playFailureDetails(provider).fields).not.toHaveProperty(
    "providerCode",
  );
  const parsed = z
    .object({ score: z.number() })
    .safeParse({ score: "private answer" });
  if (parsed.success) throw Error("Fixture should fail");
  expect(
    playFailureDetails(new PlayGradingError("validation", parsed.error)).fields,
  ).toEqual({ playGradingStage: "validation", validationIssueCount: 1 });
});
