import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { startFixtureService, fixtureOrigin } from "./fixture-service.mjs";

// Isolated infrastructure doubles. No production auth bypass or real credentials.
const dir = resolve(".playwright-e2e");
mkdirSync(dir, { recursive: true });
writeFileSync(
  resolve(dir, "tsconfig.json"),
  JSON.stringify({
    extends: "../tsconfig.json",
    include: [
      "../next-env.d.ts",
      "../src/**/*.ts",
      "../src/**/*.tsx",
      "../.next-e2e/types/**/*.ts",
    ],
    exclude: ["../node_modules"],
  }),
);
const key = resolve(dir, "fixture.key"),
  cert = resolve(dir, "fixture.crt");
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ],
  { stdio: "ignore" },
);
const fixture = await startFixtureService(key, cert);
const env = {
  ...process.env,
  NODE_ENV: "production",
  MOCKMEAI_E2E_BUILD: "1",
  NODE_EXTRA_CA_CERTS: cert,
  NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ci_fixture",
  ADMIN_USER_ID: "99999999-9999-4999-8999-999999999999",
  INTERVIEW_RESUME_SECRET:
    "ci-only-stable-resume-key-with-no-production-validity",
  INTELIPREP_ALLOW_TEST_INTERVIEWS: "0",
  NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS: "0",
  OPENAI_KEY: "ci-fake-model-key",
  OPENAI_BASE_URL: fixtureOrigin + "/v1",
  OPENAI_MODEL: "gpt-6.1-sol",
  OPENAI_SCORECARD_MODEL: "gpt-6.1-sol",
  OPENAI_INTERVIEW_REASONING_EFFORT: "low",
  OPENAI_SCORECARD_REASONING_EFFORT: "high",
  SUPABASE_CONNECTION_STRING: "",
  SUPABASE_REPORTING_CONNECTION_STRING: "",
  RESEND_API_KEY: "",
  VERCEL: "",
  VERCEL_ENV: "",
  INTELIPREP_ENV: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  KV_REST_API_URL: "",
  KV_REST_API_TOKEN: "",
};
let child;
function stop() {
  child?.kill("SIGTERM");
  fixture.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
function next(args) {
  return new Promise((resolve, reject) => {
    child = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", ...args],
      { env, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error("Isolated Next process exited " + code)),
    );
  });
}
try {
  await next(["build", "--webpack"]);
  await next(["start", "--hostname", "127.0.0.1", "--port", "3100"]);
} catch {
  if (!child?.killed) process.exitCode = 1;
} finally {
  stop();
}
