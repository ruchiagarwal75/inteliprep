import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Test builds have their own output; this flag never bypasses authentication.
  distDir: process.env.MOCKMEAI_E2E_BUILD === "1" ? ".next-e2e" : ".next",
  typescript: {
    tsconfigPath:
      process.env.MOCKMEAI_E2E_BUILD === "1"
        ? ".playwright-e2e/tsconfig.json"
        : "tsconfig.json",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  devIndicators: false,
  experimental: { serverSourceMaps: true },
  // OAuth codes arrive in this query string. Use the sanitized callback event instead.
  logging: { incomingRequests: { ignore: [/\/auth\/callback(?:\?|$)/] } },
};

export default nextConfig;
