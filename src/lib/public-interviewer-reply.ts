/** Internal topic keys, hashes and serialized separators must never reach chat. */
export function hasInternalIdentifiers(text: string): boolean {
  return /fresh:|\||\b[a-z][a-z0-9]*_[a-z0-9_]+\b|\b(?=[a-f0-9]{8,}\b)(?=[a-f0-9]*[a-f])[a-f0-9]{8,}\b/iu.test(
    text,
  );
}

/** Buffer before publishing so a split identifier cannot leak as partial deltas. */
export async function* publicInterviewerReply(parts: AsyncIterable<string>) {
  let reply = "";
  for await (const part of parts) reply += part;
  if (hasInternalIdentifiers(reply))
    throw new Error(
      "The interviewer couldn't produce a clear reply. Please retry.",
    );
  if (reply) yield reply;
}
