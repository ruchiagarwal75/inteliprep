import { expect, it } from "vitest";
import { serverErrorFrames } from "@/lib/server-error-frames";
it("retains only bounded owned file locations, never error messages, arguments or external URLs", () => {
  const error = new Error("private answer and token");
  error.stack =
    "Error: private answer and token\n at secretArgument (file:///var/task/src/lib/interview-grading.ts:145:11)\n at remote (https://attacker.example/src/lib/private-token.ts:1:2)\n at vendor (/var/task/node_modules/sdk/secret.ts:2:3)\n at bundle (/var/task/.next/server/chunks/123.js:1:200)";
  expect(serverErrorFrames(error)).toEqual([
    { file: "src/lib/interview-grading.ts", line: 145, column: 11 },
    { file: ".next/server/chunks/123.js", line: 1, column: 200 },
  ]);
  expect(JSON.stringify(serverErrorFrames(error))).not.toMatch(
    /private|token|secretArgument|attacker|var\/task/,
  );
  expect(serverErrorFrames({ stack: error.stack })).toBeUndefined();
});
it("drops forged source locations embedded in a multiline error message", () => {
  const message = "private answer\n at fake (/src/lib/private-token.ts:1:2)";
  const cause = new Error(message);
  cause.stack =
    "Error: " + message + "\n at real (/var/task/src/lib/admin-api.ts:30:4)";
  expect(serverErrorFrames(cause)).toEqual([
    { file: "src/lib/admin-api.ts", line: 30, column: 4 },
  ]);
  expect(JSON.stringify(serverErrorFrames(cause))).not.toContain(
    "private-token",
  );
});
