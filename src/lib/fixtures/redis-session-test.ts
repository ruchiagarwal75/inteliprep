/** Session/lease commands used by route tests; quota behavior has separate tests. */
export function redisSessionCommand(values: Map<string, string>) {
  return async (args: (string | number)[]) => {
    const [, key, value] = args;
    if (args[0] === "GET") return values.get(String(key)) ?? null;
    if (args[0] === "SET") {
      if (args.includes("NX") && values.has(String(key))) return null;
      values.set(String(key), String(value));
      return "OK";
    }
    if (args[0] === "EVAL") {
      if (String(args[1]).includes("INCR")) return 0;
      const lock = String(args[3]);
      const save = args[2] === 2;
      const owner = String(args[save ? 5 : 4]);
      if (values.get(lock) !== owner) return 0;
      if (save) values.set(String(args[4]), String(args[6]));
      else values.delete(lock);
      return 1;
    }
    throw new Error("Unexpected Redis command");
  };
}
