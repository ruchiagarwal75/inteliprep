import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ value: "", required: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: state.value }) }),
}));
vi.mock("./welcome-store", () => ({ welcomeRequired: state.required }));
import { welcomeRequiredForBrowser } from "./welcome-entry";
import { HOME_INTRO_SEEN } from "./home-intro-preference";
beforeEach(() => {
  state.required.mockReset().mockResolvedValue(false);
});
it.each([HOME_INTRO_SEEN, "", "other-cookie", "v0"])(
  "passes only the current home preference version to account onboarding: %s",
  async (value) => {
    state.value = value;
    await welcomeRequiredForBrowser("verified-account");
    expect(state.required).toHaveBeenCalledExactlyOnceWith(
      "verified-account",
      value === HOME_INTRO_SEEN,
    );
  },
);
