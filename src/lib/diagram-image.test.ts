import { describe, expect, it } from "vitest";
import {
  diagramImageSchema,
  MAX_DIAGRAM_IMAGE_URL_LENGTH,
  PNG_DATA_URL_PREFIX,
} from "@/lib/diagram-image";
import { PNG_FIXTURE } from "@/lib/fixtures/whiteboard-test";

describe("diagramImageSchema", () => {
  it("accepts a PNG data URL", () => {
    expect(diagramImageSchema.parse(PNG_FIXTURE)).toBe(PNG_FIXTURE);
  });

  it.each([
    "https://example.com/image.png",
    PNG_FIXTURE.replace("image/png", "image/jpeg"),
    PNG_DATA_URL_PREFIX + "!!!!",
    PNG_FIXTURE.slice(0, -1),
    PNG_DATA_URL_PREFIX + btoa("not a PNG".repeat(10)),
  ])("rejects unsupported URLs or invalid PNG headers: %s", (value) => {
    expect(diagramImageSchema.safeParse(value).success).toBe(false);
  });

  it("rejects an oversized attachment before decoding it", () => {
    expect(
      diagramImageSchema.safeParse("a".repeat(MAX_DIAGRAM_IMAGE_URL_LENGTH + 1))
        .success,
    ).toBe(false);
  });

  it.each([0, 1281, 100_000])("rejects an invalid PNG width of %i", (width) => {
    const bytes = Buffer.from(
      PNG_FIXTURE.slice(PNG_DATA_URL_PREFIX.length),
      "base64",
    );
    bytes.writeUInt32BE(width, 16);
    expect(
      diagramImageSchema.safeParse(
        PNG_DATA_URL_PREFIX + bytes.toString("base64"),
      ).success,
    ).toBe(false);
  });

  it("also caps tall diagrams", () => {
    const bytes = Buffer.from(
      PNG_FIXTURE.slice(PNG_DATA_URL_PREFIX.length),
      "base64",
    );
    bytes.writeUInt32BE(1281, 20);
    expect(
      diagramImageSchema.safeParse(
        PNG_DATA_URL_PREFIX + bytes.toString("base64"),
      ).success,
    ).toBe(false);
  });
});
