const restrictions =
  "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
export function securityHeaders() {
  return [
    { key: "Content-Security-Policy", value: restrictions },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}

/** A request nonce protects Next's bootstrap without permitting arbitrary inline scripts. */
export function pageContentSecurityPolicy(nonce: string) {
  let authOrigin = "";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (url.protocol === "https:") authOrigin = url.origin;
  } catch {
    /* Missing auth configuration must not weaken the policy. */
  }
  const dev = process.env.NODE_ENV === "development";
  return [
    restrictions,
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    // React/Excalidraw require dynamic style attributes. Scripts still require a nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://esm.sh",
    `connect-src 'self' ${authOrigin} https://esm.sh${dev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "media-src 'none'",
  ].join("; ");
}
