import { expect, it } from "vitest";
import { isInAppBrowser } from "./in-app-browser";
it.each([
  "LinkedInApp/9",
  "Reddit/2026",
  "TwitterAndroid",
  "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Version/4.0",
  "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148",
  "FBAN/FBIOS",
])("detects a webview: %s", (ua) => expect(isInAppBrowser(ua)).toBe(true));
it.each([
  "Mozilla/5.0 Chrome/145.0 Safari/537.36",
  "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/26 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 CriOS/145 Mobile/15E148 Safari/604.1",
])("keeps normal browser sign-in: %s", (ua) =>
  expect(isInAppBrowser(ua)).toBe(false),
);
