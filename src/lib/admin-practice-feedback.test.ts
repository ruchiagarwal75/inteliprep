import { beforeEach, expect, it, vi } from "vitest";
import { adminPracticeFeedback } from "@/lib/admin-practice-feedback";
import { adminQuery } from "@/lib/admin-query";
const mock = vi.hoisted(() => ({ sql: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: mock.verify }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => mock.sql }));
beforeEach(() => {
  mock.verify.mockReset().mockResolvedValue("owner");
  mock.sql.mockReset().mockImplementation((parts: TemplateStringsArray) => {
    const text = parts.join("?");
    if (text.startsWith("select f.id"))
      return Promise.resolve([{ id: "feedback", inputPreference: "talk" }]);
    if (text.startsWith("select count(*)"))
      return Promise.resolve([
        {
          total: 3,
          answered: 3,
          skipped: 0,
          menu: 0,
          loved: 1,
          okay: 1,
          not_for_me: 0,
          yes: 1,
          maybe: 1,
          no: 0,
          talk: 1,
          type: 1,
          no_preference: 1,
        },
      ]);
    return { text };
  });
});
it("returns each preference count and the saved answer under existing admin filters", async () => {
  const data = await adminPracticeFeedback(adminQuery(new URLSearchParams()));
  expect(data.entries[0].inputPreference).toBe("talk");
  expect(data.counts).toMatchObject({ talk: 1, type: 1, no_preference: 1 });
  const queries = mock.sql.mock.calls
    .map((call) => call[0].join("?"))
    .join("\n");
  expect(queries).toContain('f.input_preference as "inputPreference"');
  for (const value of ["talk", "type", "no_preference"])
    expect(queries).toContain(
      `not f.skipped and f.input_preference='${value}'`,
    );
});
it("still authorizes before querying feedback", async () => {
  mock.verify.mockRejectedValueOnce(new Error("denied"));
  await expect(
    adminPracticeFeedback(adminQuery(new URLSearchParams())),
  ).rejects.toThrow("denied");
  expect(mock.sql).not.toHaveBeenCalled();
});
