import { chromium } from "@playwright/test";
import type { Scene } from "@/lib/scene";
import { fixtureScene, type GenaiFixture } from "./genai-fixture";

/** Matching synthetic board PNGs use the same bounds and edges as the text scene. */
export async function fullInterviewImages(scenes: Record<string, Scene>) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const images: Record<string, string> = {};
    for (const [key, scene] of Object.entries(scenes)) {
      if (!scene.elements.length) continue;
      images[key] = await page.evaluate((elements) => {
        const canvas = document.createElement("canvas");
        const nodes = elements.filter(
          (element) => element.type === "rectangle",
        );
        canvas.width = Math.ceil(
          Math.max(...nodes.map((element) => element.x + element.width)) + 48,
        );
        canvas.height = Math.ceil(
          Math.max(...nodes.map((element) => element.y + element.height)) + 48,
        );
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing fixture canvas");
        context.fillStyle = "#F4F1EA";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.translate(24, 24);
        context.strokeStyle = "#0F766E";
        context.fillStyle = "#17263C";
        context.lineWidth = 2;
        for (const element of elements) {
          if (element.type !== "arrow") continue;
          const end = element.points?.at(-1);
          if (!end) continue;
          const x = element.x + end[0],
            y = element.y + end[1];
          const angle = Math.atan2(end[1], end[0]);
          context.beginPath();
          context.moveTo(element.x, element.y);
          context.lineTo(x, y);
          context.lineTo(
            x - 9 * Math.cos(angle - 0.45),
            y - 9 * Math.sin(angle - 0.45),
          );
          context.moveTo(x, y);
          context.lineTo(
            x - 9 * Math.cos(angle + 0.45),
            y - 9 * Math.sin(angle + 0.45),
          );
          context.stroke();
        }
        for (const element of elements) {
          if (element.type === "rectangle") {
            context.fillStyle = "#E1EFE8";
            context.fillRect(
              element.x,
              element.y,
              element.width,
              element.height,
            );
            context.strokeRect(
              element.x,
              element.y,
              element.width,
              element.height,
            );
          }
        }
        context.fillStyle = "#17263C";
        context.font = "16px sans-serif";
        for (const element of elements) {
          if (element.type !== "text") continue;
          const words = (element.originalText ?? element.text ?? "").split(
            /\s+/u,
          );
          let line = "",
            y = element.y;
          for (const word of words) {
            const next = line ? line + " " + word : word;
            if (context.measureText(next).width > element.width && line) {
              context.fillText(line, element.x, y);
              y += 21;
              line = word;
            } else line = next;
          }
          if (line) context.fillText(line, element.x, y);
        }
        return canvas.toDataURL("image/png");
      }, scene.elements);
    }
    return images;
  } finally {
    await browser.close();
  }
}

export function fullInterviewScenes(fixture: GenaiFixture) {
  const evalIndex = fixture.strongNodes.findIndex((label) =>
    /eval|judge/iu.test(label),
  );
  return {
    empty: fixtureScene([]),
    partial: fixtureScene(fixture.strongNodes.slice(0, 1)),
    full: fixtureScene(fixture.strongNodes, fixture.strongEdges),
    updated: fixtureScene(
      [...fixture.strongNodes, "Evaluation rollout gate"],
      [
        ...fixture.strongEdges,
        [
          evalIndex < 0 ? fixture.strongNodes.length - 1 : evalIndex,
          fixture.strongNodes.length,
        ],
      ],
    ),
  };
}
