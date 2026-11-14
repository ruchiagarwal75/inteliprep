import type { Locator } from "@playwright/test";

/** Next keeps streamed HTML outside the active page in hidden S: containers. */
export function rendered(locator: Locator) {
  return locator.and(
    locator
      .page()
      .locator(':not([hidden][id^="S:"]):not([hidden][id^="S:"] *)'),
  );
}
