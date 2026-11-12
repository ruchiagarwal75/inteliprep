import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  readFileSync("public/fonts/play/manifest.json", "utf8"),
);
for (const font of manifest) {
  const bytes = readFileSync(font.file);
  if (
    bytes.subarray(0, 4).toString() !== "wOF2" ||
    createHash("sha256").update(bytes).digest("hex") !== font.sha256
  )
    throw Error("Play font integrity failed");
  const license = readFileSync(font.license, "utf8");
  if (
    !license.includes("SIL OPEN FONT LICENSE") ||
    !license.includes("Copyright")
  )
    throw Error("Play font license missing");
}
console.log("Play fonts verified: self-hosted WOFF2 files and SIL licenses.");
