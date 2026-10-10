import { z } from "zod";

export const MAX_DIAGRAM_IMAGE_DIMENSION = 1_280;
export const MAX_DIAGRAM_IMAGE_BYTES = 1_000_000;
export const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
export const MAX_DIAGRAM_IMAGE_URL_LENGTH =
  PNG_DATA_URL_PREFIX.length + 4 * Math.ceil(MAX_DIAGRAM_IMAGE_BYTES / 3);

/** Check the PNG header and dimensions without decoding an unbounded image. */
export const diagramImageSchema = z.string().superRefine((value, ctx) => {
  const invalid = (message: string) =>
    ctx.addIssue({ code: "custom", message });
  if (value.length > MAX_DIAGRAM_IMAGE_URL_LENGTH) {
    invalid("Whiteboard image must be at most 1 MB");
    return;
  }
  if (!value.startsWith(PNG_DATA_URL_PREFIX)) {
    invalid("Whiteboard image must be a base64 PNG data URL");
    return;
  }
  const encoded = value.slice(PNG_DATA_URL_PREFIX.length);
  if (
    encoded.length < 44 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    invalid("Whiteboard image contains invalid base64 PNG data");
    return;
  }
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  if ((encoded.length / 4) * 3 - padding > MAX_DIAGRAM_IMAGE_BYTES) {
    invalid("Whiteboard image must be at most 1 MB");
    return;
  }
  const header = Uint8Array.from(atob(encoded.slice(0, 44)), (char) =>
    char.charCodeAt(0),
  );
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const view = new DataView(header.buffer);
  if (
    !signature.every((byte, index) => header[index] === byte) ||
    view.getUint32(8) !== 13 ||
    String.fromCharCode(...header.slice(12, 16)) !== "IHDR"
  ) {
    invalid("Whiteboard image must contain a PNG header");
    return;
  }
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_DIAGRAM_IMAGE_DIMENSION ||
    height > MAX_DIAGRAM_IMAGE_DIMENSION
  ) {
    invalid("Whiteboard image dimensions must be between 1 and 1280 pixels");
  }
});
