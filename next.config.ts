import { domainRedirects } from "./src/lib/domain-redirects";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return domainRedirects();
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.js$/u,
      include: resolve("node_modules/@excalidraw/excalidraw/dist"),
      use: [resolve("scripts/excalidraw-fonts-loader.cjs")],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.js": {
        condition: { path: /@excalidraw\/excalidraw\/dist\/(?:dev|prod)\//u },
        loaders: ["./scripts/excalidraw-fonts-loader.cjs"],
      },
    },
  },
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
