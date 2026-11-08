import "server-only";

// Source maps remain server-only. This affects diagnostics, never browser responses.
process.setSourceMapsEnabled(true);
export function serverErrorFrames(cause: unknown) {
  try {
    return extractFrames(cause);
  } catch {
    return;
  }
}
function extractFrames(cause: unknown) {
  if (!(cause instanceof Error)) return;
  const stack = cause.stack;
  if (typeof stack !== "string" || stack.length > 20000) return;
  const heading = cause.name + (cause.message ? ": " + cause.message : "");
  // Error messages can contain newlines and forged frame text. Remove the complete heading.
  if (!stack.startsWith(heading + "\n")) return;
  const frames: { file: string; line: number; column: number }[] = [];
  for (const frame of stack.slice(heading.length).split("\n").slice(1, 25)) {
    if (/https?:\/\//u.test(frame)) continue;
    const match = frame.match(
      /(?:\/|^)((?:src\/|\.next\/server\/)[A-Za-z0-9_./\[\]()-]+\.(?:tsx?|m?js|cjs)):(\d+):(\d+)\)?$/u,
    );
    if (!match || match[1].length > 240 || match[1].includes("..")) continue;
    const line = Number(match[2]),
      column = Number(match[3]);
    if (line < 1 || line > 10000000 || column < 1 || column > 10000000)
      continue;
    frames.push({ file: match[1], line, column });
    if (frames.length === 8) break;
  }
  return frames.length ? frames : undefined;
}
