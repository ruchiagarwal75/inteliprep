import { resolveMx, resolveTxt } from "node:dns/promises";
import { BRAND } from "../src/lib/brand.ts";

// Read-only checks for the default Resend sending setup. No email or credentials.
const checks = [
  ["DKIM", `resend._domainkey.${BRAND.domain}`, resolveTxt],
  ["SPF", `send.${BRAND.domain}`, resolveTxt],
  ["Return-path MX", `send.${BRAND.domain}`, resolveMx],
];
let missing = false;
for (const [record, host, resolve] of checks) {
  try {
    const values = await resolve(host);
    console.log(JSON.stringify({ record, host, values }));
  } catch (error) {
    missing = true;
    console.log(JSON.stringify({ record, host, error: error.code }));
  }
}
console.log(
  "Compare these public records with the exact values shown in Resend.",
);
if (missing) process.exitCode = 1;
