import { expect, it } from "vitest";
import { installTestModelKey } from "./helpers/test-model-key";

it("uses the separate test key even when the app key is present", () => {
  const environment = {
    OPENAI_KEY: "app-key-fixture",
    OPENAI_TEST_KEY: " test-key-fixture ",
  };
  installTestModelKey(environment);
  expect(environment.OPENAI_KEY).toBe("test-key-fixture");
});
it.each([undefined, "", "   "])(
  "refuses an app-key fallback when the test key is %s",
  (testKey) => {
    const environment = {
      OPENAI_KEY: "app-key-fixture",
      OPENAI_TEST_KEY: testKey,
    };
    expect(() => installTestModelKey(environment)).toThrow(
      "require OPENAI_TEST_KEY",
    );
    expect(environment.OPENAI_KEY).toBe("");
  },
);
it("does not put key values in a setup error", () => {
  const environment = { OPENAI_KEY: "app-key-fixture" };
  try {
    installTestModelKey(environment);
  } catch (cause) {
    expect(String(cause)).not.toContain("app-key-fixture");
    return;
  }
  throw new Error("Missing test key should fail");
});
