/** Files may be pasted into SQL Editor with their own BEGIN/COMMIT. The CLI
 * already owns a transaction and advisory lock, so remove that outer pair only.
 * New wrapped files must start with BEGIN; and end with COMMIT; on their own lines.
 */
export function migrationBody(source) {
  const lines = source.trim().split(/\r?\n/u);
  const starts = /^begin;$/iu.test(lines[0].trim());
  const ends = /^commit;$/iu.test(lines.at(-1).trim());
  if (starts !== ends) throw Error("Unpaired migration transaction");
  return starts ? lines.slice(1, -1).join("\n") : source;
}
