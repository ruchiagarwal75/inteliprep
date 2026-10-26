import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCandidateBrowserScope } from "@/lib/candidate-browser-scope";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("browser account isolation", () => {
  it("partitions reads, writes, deletes and active selections, even for the same interview ID", async () => {
    const a = createCandidateBrowserScope(alice),
      b = createCandidateBrowserScope(bob);
    const saved = savedFixture();
    await a.storage.saveInterview(saved);
    expect(await b.storage.listInterviews()).toEqual([]);
    expect(await b.storage.readInterview(saved.id)).toBeUndefined();
    expect(await b.storage.activeInterviewId()).toBeUndefined();
    await b.storage.saveInterview({ ...saved, draftText: "Bob's draft" });
    await b.storage.deleteInterview(saved.id);
    expect(await a.storage.readInterview(saved.id)).toEqual(saved);
    expect(await a.storage.activeInterviewId()).toBe(saved.id);
    const reopened = createCandidateBrowserScope(alice);
    expect(await reopened.storage.readInterview(saved.id)).toEqual(saved);
  });
  it("retains anonymous history without automatically assigning it to an account", async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open("inteliprep", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("interviews", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("interviews", "readwrite");
        tx.objectStore("interviews").put(savedFixture());
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    expect(
      await createCandidateBrowserScope(alice).storage.listInterviews(),
    ).toEqual([]);
    expect(
      await createCandidateBrowserScope(bob).storage.listInterviews(),
    ).toEqual([]);
    expect((await indexedDB.databases()).map((x) => x.name)).toContain(
      "inteliprep",
    );
  });
  it("blocks queued and late saves from a deactivated account", async () => {
    const a = createCandidateBrowserScope(alice);
    const pending = a.storage.saveInterview(savedFixture());
    a.deactivate();
    await expect(pending).rejects.toThrow("account changed");
    await expect(a.storage.saveInterview(savedFixture())).rejects.toThrow(
      "account changed",
    );
    expect(
      await createCandidateBrowserScope(alice).storage.listInterviews(),
    ).toEqual([]);
  });
  it("pins requests to their account and cancels in-flight requests on logout", async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      );
    vi.stubGlobal("fetch", network);
    const a = createCandidateBrowserScope(alice);
    const pending = a.request("/api/interview/start", {
      headers: { "X-Interview-Account": bob },
    });
    expect(
      new Headers(network.mock.calls[0][1]?.headers).get("X-Interview-Account"),
    ).toBe(alice);
    a.deactivate();
    await expect(pending).rejects.toThrow("Aborted");
    await expect(a.request("/api/chat")).rejects.toThrow();
    expect(network).toHaveBeenCalledOnce();
  });
  it("survives Strict Mode effect replay but cancels on a real unmount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    const scope = createCandidateBrowserScope(alice);
    const detach = scope.attach();
    detach();
    const realDetach = scope.attach();
    await Promise.resolve();
    expect((await scope.request("/api/chat")).status).toBe(200);
    realDetach();
    await Promise.resolve();
    await expect(scope.request("/api/chat")).rejects.toThrow();
  });
  it("invalidates the workspace when an API reports an expired or switched account", async () => {
    const changed = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    const scope = createCandidateBrowserScope(alice, changed);
    await scope.request("/api/chat");
    expect(changed).toHaveBeenCalledOnce();
    await expect(scope.storage.listInterviews()).rejects.toThrow(
      "account changed",
    );
  });
});
