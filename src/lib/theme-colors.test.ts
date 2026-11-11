import { afterEach, expect, it, vi } from "vitest";
import { themeColor } from "./theme-colors";
afterEach(() => vi.unstubAllGlobals());
it("resolves and trims the CSS token for canvas APIs", () => {
  vi.stubGlobal("document", { documentElement: {} });
  const getPropertyValue = vi.fn(() => " #ffffff ");
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue }));
  expect(themeColor("--diagram-export-background")).toBe("#ffffff");
  expect(getPropertyValue).toHaveBeenCalledWith("--diagram-export-background");
});
it("reports a missing canvas palette instead of exporting the wrong background", () => {
  vi.stubGlobal("document", { documentElement: {} });
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));
  expect(() => themeColor("--canvas-background")).toThrow(
    "whiteboard colors couldn't load",
  );
});
