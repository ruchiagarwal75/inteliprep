/** The pinned library always appends a CDN fallback, even with EXCALIDRAW_ASSET_PATH.
 * Browsers validate every FontFace source against CSP at registration. Keep that
 * fallback same-origin too, without changing node_modules or the font artwork.
 */
module.exports = function localExcalidrawFonts(source) {
  if (!source.includes('"ASSETS_FALLBACK_URL"')) return source;
  let changed = 0;
  const result = source.replace(
    /("ASSETS_FALLBACK_URL",\s*)`https:\/\/esm\.sh\/[\s\S]*?\/dist\/prod\/`/gu,
    (_, prefix) => {
      changed++;
      return (
        prefix +
        'new URL("/fonts/excalidraw/", globalThis.location.origin).href'
      );
    },
  );
  if (changed !== 1)
    throw new Error(
      "Review the pinned Excalidraw font fallback before upgrading.",
    );
  return result;
};
