import { expect, test } from "@playwright/test";
import { rendered } from "./rendered";

test("rendered assertions exclude only hidden streamed copies and retain real duplicates", async ({
  page,
}) => {
  await page.setContent(`
    <main>
      <p aria-label="Slide counter">1 / 13</p>
      <section id="rag-boss" data-boss-state="ready">Start boss</section>
      <p id="application-hidden" hidden>Still part of the app DOM</p>
    </main>
    <div hidden id="S:1">
      <p aria-label="Slide counter">1 / 13</p>
      <section id="rag-boss" data-boss-state="ready">Start boss</section>
    </div>
  `);
  const counter = page.getByLabel("Slide counter");
  await expect(counter).toHaveCount(2);
  await expect(rendered(counter)).toHaveText("1 / 13");
  await expect(rendered(page.locator("#rag-boss"))).toHaveCount(1);
  await expect(rendered(page.locator("#application-hidden"))).toHaveCount(1);
  await expect(rendered(page.locator("#application-hidden"))).not.toBeVisible();
  await page.evaluate(() => {
    const duplicate = document.createElement("p");
    duplicate.setAttribute("aria-label", "Slide counter");
    duplicate.textContent = "2 / 13";
    document.querySelector("main")?.append(duplicate);
  });
  await expect(rendered(counter)).toHaveCount(2);
  await page
    .locator('[hidden][id="S:1"]')
    .evaluate((node) => node.removeAttribute("hidden"));
  await expect(rendered(counter)).toHaveCount(3);
});
