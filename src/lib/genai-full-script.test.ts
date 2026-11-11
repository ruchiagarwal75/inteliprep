import { expect, it } from "vitest";
import { fullInterviewScript } from "../../tests/live/full-genai-script";
for (const id of [
  "enterprise-rag-assistant",
  "ai-chat-assistant",
  "tool-using-ai-agent",
])
  it(`keeps the full ${id} script within a 45-minute interview`, () => {
    const rows = fullInterviewScript();
    expect(rows).toHaveLength(37);
    expect(
      rows
        .filter((row) => !row.action)
        .every((row) => row.task && !row.content),
    ).toBe(true);
    expect(rows.at(-1)?.minute).toBe(44.5);
    expect(
      rows.every(
        (r, i) =>
          r.minute > 0 &&
          r.minute < 45 &&
          (!i || r.minute > rows[i - 1].minute),
      ),
    ).toBe(true);
    expect(rows.filter((r) => r.image)).toHaveLength(2);
    expect(rows.filter((r) => r.action === "review")).toHaveLength(2);
    expect(rows.length * 2 + 1).toBeLessThan(99);
  });
