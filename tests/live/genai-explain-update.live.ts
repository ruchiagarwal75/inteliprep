import { expect, it, vi } from "vitest";
import { acknowledgeDesignUpdate } from "@/lib/design-update-acknowledgement";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("acknowledges the stated evaluation gate without instructions or a probe", async () => {
  const reply = await acknowledgeDesignUpdate(
    {
      role: "user",
      content:
        "I added an evaluation gate. It blocks a release when quality falls below our approved baseline.",
    },
    "Added: evaluation gate",
  );
  expect(reply).toMatch(/evaluation gate/iu);
  expect(reply).not.toMatch(/\?|earlier explanation|Done explaining/iu);
  console.info("Re-explanation acknowledgement:", reply);
});
