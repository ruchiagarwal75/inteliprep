/** Configure before importing Excalidraw, including image-only exports. */
export function configureWhiteboardAssets() {
  if (typeof window !== "undefined")
    Object.assign(window, { EXCALIDRAW_ASSET_PATH: "/fonts/excalidraw/" });
}
