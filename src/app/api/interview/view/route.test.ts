import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/view/route";
const { record } = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/beta-funnel-tracking", () => ({
  recordScorecardOpened: record,
}));
const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) =>
  new Request("https://mockmeai.test/api/interview/view", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://mockmeai.test",
    },
    body: JSON.stringify(body),
  });
beforeEach(() => record.mockReset().mockResolvedValue(true));
it("accepts only an owned scorecard ID and returns no-store", async () => {
  const response = await POST(request({ interviewId: id }));
  expect(response.status).toBe(204);
  expect(record).toHaveBeenCalledWith(id, id);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  record.mockResolvedValueOnce(false);
  expect((await POST(request({ interviewId: id }))).status).toBe(404);
});
it("rejects client timing, stage claims and text", async () => {
  expect(
    (await POST(request({ interviewId: id, elapsed: 9999, comment: "answer" })))
      .status,
  ).toBe(400);
  expect(record).not.toHaveBeenCalled();
});
