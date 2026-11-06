import { describe, expect, it } from "vitest";
import {
  interviewHref,
  interviewIdFromSearch,
  initialInterviewId,
} from "@/lib/interview-navigation";

describe("browser-local interview links", () => {
  it("keeps Home visible on bare loads and honors older explicit links", () => {
    const newest = crypto.randomUUID(),
      older = crypto.randomUUID();
    const history = [{ id: newest }, { id: older }];
    expect(initialInterviewId("", history)).toBeUndefined();
    expect(initialInterviewId(`?session=${older}`, history)).toBe(older);
    expect(initialInterviewId("?session=invalid", history)).toBeUndefined();
    expect(initialInterviewId("", [])).toBeUndefined();
  });
  it("round-trips a session and uses the setup route without one", () => {
    const id = crypto.randomUUID();
    expect(interviewHref()).toBe("/interview/new");
    expect(interviewHref(id)).toBe(`/interview/${id}`);
    expect(interviewIdFromSearch(`?session=${id}&other=value`)).toBe(id);
  });
  it.each(["", "?session=invalid", "?session=", "?other=value"])(
    "rejects missing or invalid session values: %s",
    (search) => {
      expect(interviewIdFromSearch(search)).toBeUndefined();
    },
  );
});
