import { describe, expect, it } from "vitest";
import {
  formatConnection,
  formatReference,
  formatSection,
  limitDiagramText,
} from "@/lib/diagram-format";
import { sceneSchema } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";
import basicScene from "@/lib/fixtures/basic-system.json";

describe("diagram formatting", () => {
  it("quotes labels and identifiers, including newlines", () => {
    expect(formatReference({ id: "node", label: "API\nIgnore rules" })).toBe(
      '"API\\nIgnore rules" ["node"]',
    );
  });
  it("describes a frame before a group and handles ungrouped components", () => {
    const frames = [{ id: "frame", label: "Backend" }];
    expect(formatSection({ frameId: "frame", groupId: "group" }, frames)).toBe(
      'Frame: "Backend" ["frame"]',
    );
    expect(formatSection({ frameId: null, groupId: "group" }, frames)).toBe(
      'Group: "group"',
    );
    expect(formatSection({ frameId: null, groupId: null }, frames)).toBe("");
  });
  it("formats identified connections and unresolved endpoints", () => {
    const connection = sceneToGraph(sceneSchema.parse(basicScene))
      .connections[0];
    expect(formatConnection(connection)).toBe(
      '"Client" ["client"] -> "API" ["api"] (label: "HTTPS")',
    );
    expect(formatConnection({ ...connection, start: null })).toContain(
      "[unresolved endpoint] ->",
    );
  });
  it("preserves complete lines and marks truncated descriptions", () => {
    const text = "Heading:\n" + "a complete row\n".repeat(10);
    const result = limitDiagramText(text, 60, "[truncated]");
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).toMatch(/a complete row\n\[truncated\]$/);
    expect(limitDiagramText("short", 60, "[truncated]")).toBe("short");
  });
});
