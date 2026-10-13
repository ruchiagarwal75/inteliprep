import { describe, expect, it } from "vitest";
import {
  interviewHref,
  interviewIdFromSearch,
} from "@/lib/interview-navigation";

describe("browser-local interview links", () => {
  it("round-trips a session and uses the setup route without one", () => {
    const id = crypto.randomUUID();
    expect(interviewHref()).toBe("/interview");
    expect(interviewHref(id)).toBe(`/interview?session=${id}`);
    expect(interviewIdFromSearch(`?session=${id}&other=value`)).toBe(id);
  });
  it.each(["", "?session=invalid", "?session=", "?other=value"])(
    "rejects missing or invalid session values: %s",
    (search) => {
      expect(interviewIdFromSearch(search)).toBeUndefined();
    },
  );
});
