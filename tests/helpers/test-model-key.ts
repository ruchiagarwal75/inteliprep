type TestEnvironment = Record<string, string | undefined>;

/** Fail closed before test imports can inherit the application's provider key. */
export function installTestModelKey(environment: TestEnvironment) {
  const key = environment.OPENAI_TEST_KEY?.trim();
  environment.OPENAI_KEY = key ?? "";
  if (!key)
    throw new Error(
      "Live model tests require OPENAI_TEST_KEY. The app's OPENAI_KEY is never used.",
    );
}
