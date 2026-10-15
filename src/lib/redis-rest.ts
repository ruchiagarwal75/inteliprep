import "server-only";
import { BetaUnavailableError } from "@/lib/beta-config";
import { redisConnection } from "@/lib/redis-config";

/** No retries on mutations: a timed-out request may already have committed. */
export async function redisCommand(
  command: (string | number)[],
): Promise<unknown> {
  try {
    const redis = redisConnection();
    const response = await fetch(redis.url ?? "", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Redis unavailable");
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("result" in data) ||
      "error" in data
    )
      throw new Error("Invalid Redis response");
    return data.result;
  } catch {
    // Provider bodies/headers and connection credentials never enter logs or responses.
    throw new BetaUnavailableError();
  }
}
