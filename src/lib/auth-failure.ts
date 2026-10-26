/** Classify only allowlisted metadata; never inspect or return error messages. */
export function authFailureKind(
  cause: unknown,
): "connection" | "verifier" | "rejected" {
  const value =
    cause && typeof cause === "object"
      ? (cause as Record<string, unknown>)
      : {};
  if (
    value.name === "AuthPKCECodeVerifierMissingError" ||
    value.code === "pkce_code_verifier_not_found"
  )
    return "verifier";
  const nested =
    value.cause && typeof value.cause === "object"
      ? (value.cause as Record<string, unknown>)
      : {};
  const networkCodes = [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
  ];
  if (
    value.name === "AuthRetryableFetchError" ||
    value.name === "AbortError" ||
    value.name === "TimeoutError" ||
    value.status === 0 ||
    (typeof value.code === "string" && networkCodes.includes(value.code)) ||
    (typeof nested.code === "string" && networkCodes.includes(nested.code))
  )
    return "connection";
  return "rejected";
}
