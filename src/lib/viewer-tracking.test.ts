import { afterEach, expect, it, vi } from "vitest";
const { query, budget } = vi.hoisted(() => ({
  query: vi.fn<
    (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>
  >(async () => []),
  budget: vi.fn(async () => true),
}));
vi.mock("@/lib/viewer-row-budget", () => ({ reserveViewerRow: budget }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => query }));
import { trackAppViewer, viewerHash } from "@/lib/viewer-tracking";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
it("does not fail account reporting or leak an address when optional IP storage fails", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  query
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(Error("private database diagnostic"));
  await expect(
    trackAppViewer(viewer, undefined, false, "a".repeat(64)),
  ).resolves.toBeUndefined();
  expect(log).toHaveBeenCalled();
  expect(JSON.stringify(log.mock.calls)).not.toContain(
    "private database diagnostic",
  );
  expect(JSON.parse(log.mock.calls[0][0]).kind).toBe("ip_comparison_write");
});
const viewer = "11111111-aaaa-4111-8111-111111111111";
it("uses a stable pseudonym and separates admin, development, and ordinary production visits", async () => {
  expect(viewerHash(viewer)).toBe(viewerHash(viewer.toUpperCase()));
  expect(viewerHash(viewer)).not.toContain(viewer);
  expect(viewerHash(viewer)).toMatch(/^[a-f0-9]{64}$/u);
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("ADMIN_USER_ID", "99999999-9999-4999-8999-999999999999");
  await trackAppViewer(viewer, undefined, false);
  expect(query.mock.calls.at(-1)?.at(-1)).toBe(false);
  await trackAppViewer(viewer, "99999999-9999-4999-8999-999999999999", false);
  expect(query.mock.calls.at(-1)?.at(-1)).toBe(true);
  await trackAppViewer(viewer, undefined, true);
  expect(query.mock.calls.at(-1)?.at(-1)).toBe(true);
});

it("skips new browser rows when the shared budget is exhausted but retains verified account reporting", async () => {
  budget.mockResolvedValueOnce(false);
  query.mockClear();
  await trackAppViewer(viewer, "11111111-1111-4111-8111-111111111111", false);
  const statements = query.mock.calls.map((call) => String(call[0]));
  expect(
    statements.some((text) =>
      text.includes("insert into interview_admin.app_viewers"),
    ),
  ).toBe(false);
  expect(
    statements.some((text) =>
      text.includes("insert into interview_admin.app_visitor_accounts"),
    ),
  ).toBe(true);
});
