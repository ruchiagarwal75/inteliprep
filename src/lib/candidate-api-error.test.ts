import { expect, it } from "vitest";
import {
  isCandidateAuthFailure,
  CANDIDATE_AUTH_ERROR_HEADER,
  CANDIDATE_AUTH_REQUIRED,
  CANDIDATE_ACCOUNT_CHANGED,
} from "@/lib/candidate-api-error";

it.each([
  [401, CANDIDATE_AUTH_REQUIRED, true],
  [403, CANDIDATE_ACCOUNT_CHANGED, true],
  [401, undefined, false],
  [403, undefined, false],
  [401, "expired_secret_key", false],
  [401, CANDIDATE_ACCOUNT_CHANGED, false],
  [403, CANDIDATE_AUTH_REQUIRED, false],
  [503, CANDIDATE_AUTH_REQUIRED, false],
] as const)(
  "classifies only a matching app-auth status and marker (%s, %s)",
  (status, code, expected) => {
    expect(
      isCandidateAuthFailure(
        new Response("", {
          status,
          headers: code ? { [CANDIDATE_AUTH_ERROR_HEADER]: code } : {},
        }),
      ),
    ).toBe(expected);
  },
);
