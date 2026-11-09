import { expect, it, vi } from "vitest";
import { createAppViewerReporter } from "@/lib/app-viewer-reporter";

it("resends the same browser ID after sign-in but deduplicates repeated auth events", async () => {
  const identify = vi.fn(async () => "browser-id");
  const send = vi.fn(async () => true);
  const report = createAppViewerReporter(identify, send);
  await report(true);
  await report(true);
  await Promise.all([report(true, "account-id"), report(true, "account-id")]);
  await report(true, "account-id");
  expect(send.mock.calls).toEqual([["browser-id"], ["browser-id"]]);
  await report(true, "second-account");
  expect(send).toHaveBeenCalledTimes(3);
});
it("links an existing browser after sign-in on an admin or not-invited page without creating an entry visit", async () => {
  const identify = vi.fn(async () => "existing-browser");
  const send = vi.fn(async () => true);
  const report = createAppViewerReporter(identify, send);
  await report(false);
  expect(identify).not.toHaveBeenCalled();
  await report(false, "signed-in-account");
  expect(identify).toHaveBeenCalledWith(false);
  expect(send).toHaveBeenCalledWith("existing-browser");
});
it("can retry a failed report, and skips unavailable storage", async () => {
  const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  const report = createAppViewerReporter(async () => "browser-id", send);
  await report(true);
  await report(true);
  expect(send).toHaveBeenCalledTimes(2);
  await createAppViewerReporter(async () => undefined, send)(true);
  expect(send).toHaveBeenCalledTimes(2);
});
