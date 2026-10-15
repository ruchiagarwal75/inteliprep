import "server-only";

/** Select one complete credential family so two databases cannot get mixed. */
export function redisConnection() {
  const direct = Boolean(
    process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  const native =
    !direct &&
    Boolean(process.env.KV_REST_API_URL || process.env.KV_REST_API_TOKEN);
  const urlKey = native ? "KV_REST_API_URL" : "UPSTASH_REDIS_REST_URL";
  const tokenKey = native ? "KV_REST_API_TOKEN" : "UPSTASH_REDIS_REST_TOKEN";
  return {
    urlKey,
    tokenKey,
    url: process.env[urlKey],
    token: process.env[tokenKey],
  };
}
