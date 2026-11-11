import { afterEach, describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import {
  applyTheme,
  parseTheme,
  THEME_BOOTSTRAP,
  THEME_COOKIE,
  THEME_EVENT,
  THEME_STORAGE_KEY,
} from "./theme-preference";
afterEach(() => vi.unstubAllGlobals());
function boot({
  cookie = "",
  stored = null,
  server = "light",
  blockStorage = false,
  blockCookies = false,
}: {
  cookie?: string;
  stored?: string | null;
  server?: string;
  blockStorage?: boolean;
  blockCookies?: boolean;
} = {}) {
  const root = { dataset: { theme: server } };
  const storage = {
    getItem: () => {
      if (blockStorage) throw Error("Blocked");
      return stored;
    },
    setItem: vi.fn(() => {
      if (blockStorage) throw Error("Blocked");
    }),
  };
  let written = "";
  const document = {
    documentElement: root,
    get cookie() {
      if (blockCookies) throw Error("Blocked");
      return cookie;
    },
    set cookie(value: string) {
      if (blockCookies) throw Error("Blocked");
      written = value;
    },
  };
  runInNewContext(THEME_BOOTSTRAP, {
    document,
    localStorage: storage,
    location: { protocol: "https:" },
  });
  return { theme: root.dataset.theme, written, storage };
}
describe("theme preference before first paint", () => {
  it("defaults to light and ignores invalid values", () => {
    expect(boot().theme).toBe("light");
    expect(
      boot({ stored: "system", cookie: `${THEME_COOKIE}=invalid` }).theme,
    ).toBe("light");
    expect(parseTheme("system")).toBeUndefined();
    expect(parseTheme("dark")).toBe("dark");
  });
  it("uses the server cookie and restores a storage-only choice before paint", () => {
    expect(
      boot({ cookie: `${THEME_COOKIE}=dark`, stored: "light" }).theme,
    ).toBe("dark");
    const result = boot({ stored: "dark" });
    expect(result.theme).toBe("dark");
    expect(result.written).toContain(`${THEME_COOKIE}=dark`);
    expect(result.written).toContain("; Secure");
  });
  it("keeps working with either or both storage mechanisms blocked", () => {
    expect(
      boot({ cookie: `${THEME_COOKIE}=dark`, blockStorage: true }).theme,
    ).toBe("dark");
    expect(boot({ stored: "dark", blockCookies: true }).theme).toBe("dark");
    expect(
      boot({ server: "dark", blockCookies: true, blockStorage: true }).theme,
    ).toBe("dark");
  });
  it("updates the DOM, both stores, and subscribers when toggled", () => {
    const root = { dataset: { theme: "light" } };
    const document = { documentElement: root, cookie: "" };
    const setItem = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("document", document);
    vi.stubGlobal("localStorage", { setItem });
    vi.stubGlobal("location", { protocol: "https:" });
    vi.stubGlobal("window", { dispatchEvent });
    applyTheme("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(THEME_EVENT);
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw Error("Blocked");
      },
    });
    Object.defineProperty(document, "cookie", {
      set: () => {
        throw Error("Blocked");
      },
    });
    expect(() => applyTheme("light")).not.toThrow();
    expect(root.dataset.theme).toBe("light");
  });
});
